-- VetConnect Pakistan Backend Phase 1
-- Run once in the Supabase SQL Editor on a new project.

create extension if not exists pgcrypto;

do $$ begin
  create type public.account_role as enum (
    'super_admin',
    'career_admin',
    'veterinarian',
    'company',
    'candidate',
    'user'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.approval_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  phone text,
  city text,
  primary_role public.account_role not null default 'user',
  account_status text not null default 'active' check (account_status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.account_role not null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table if not exists public.veterinarian_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  pvmc_number text,
  qualifications text,
  specialization text,
  years_experience integer not null default 0 check (years_experience >= 0),
  city text,
  services text[] not null default '{}',
  verification_status public.approval_status not null default 'pending',
  rejection_reason text,
  verified_at timestamptz,
  verified_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.company_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  company_name text not null default '',
  business_type text,
  registration_number text,
  city text,
  address text,
  description text,
  verification_status public.approval_status not null default 'pending',
  rejection_reason text,
  verified_at timestamptz,
  verified_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists profiles_primary_role_idx on public.profiles(primary_role);
create index if not exists veterinarian_verification_idx on public.veterinarian_profiles(verification_status);
create index if not exists company_verification_idx on public.company_profiles(verification_status);
create index if not exists audit_logs_created_at_idx on public.audit_logs(created_at desc);

create or replace function public.is_admin(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = check_user_id
      and role in ('super_admin', 'career_admin')
  );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text;
  safe_role public.account_role;
begin
  requested_role := coalesce(new.raw_user_meta_data ->> 'role', 'user');
  safe_role := case requested_role
    when 'veterinarian' then 'veterinarian'::public.account_role
    when 'company' then 'company'::public.account_role
    when 'candidate' then 'candidate'::public.account_role
    else 'user'::public.account_role
  end;

  insert into public.profiles (id, email, full_name, phone, city, primary_role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    nullif(new.raw_user_meta_data ->> 'city', ''),
    safe_role
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, safe_role)
  on conflict do nothing;

  if safe_role = 'veterinarian' then
    insert into public.veterinarian_profiles (user_id, pvmc_number, city)
    values (
      new.id,
      nullif(new.raw_user_meta_data ->> 'pvmc_number', ''),
      nullif(new.raw_user_meta_data ->> 'city', '')
    )
    on conflict (user_id) do nothing;
  elsif safe_role = 'company' then
    insert into public.company_profiles (user_id, company_name, city)
    values (
      new.id,
      coalesce(
        nullif(new.raw_user_meta_data ->> 'organization_name', ''),
        new.raw_user_meta_data ->> 'full_name',
        ''
      ),
      nullif(new.raw_user_meta_data ->> 'city', '')
    )
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

create or replace function public.protect_profile_permissions()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user not in ('postgres', 'service_role', 'supabase_admin')
    and not public.is_admin() and (
    new.primary_role is distinct from old.primary_role or
    new.account_status is distinct from old.account_status or
    new.email is distinct from old.email
  ) then
    raise exception 'Only an administrator can change role or account status';
  end if;
  return new;
end;
$$;

create or replace function public.protect_verification_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user not in ('postgres', 'service_role', 'supabase_admin')
    and not public.is_admin() and (
    new.verification_status is distinct from old.verification_status or
    new.rejection_reason is distinct from old.rejection_reason or
    new.verified_at is distinct from old.verified_at or
    new.verified_by is distinct from old.verified_by
  ) then
    raise exception 'Only an administrator can review a profile';
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute procedure public.set_updated_at();
drop trigger if exists vet_profiles_set_updated_at on public.veterinarian_profiles;
create trigger vet_profiles_set_updated_at before update on public.veterinarian_profiles
  for each row execute procedure public.set_updated_at();
drop trigger if exists company_profiles_set_updated_at on public.company_profiles;
create trigger company_profiles_set_updated_at before update on public.company_profiles
  for each row execute procedure public.set_updated_at();

drop trigger if exists profiles_protect_permissions on public.profiles;
create trigger profiles_protect_permissions before update on public.profiles
  for each row execute procedure public.protect_profile_permissions();
drop trigger if exists vet_profiles_protect_verification on public.veterinarian_profiles;
create trigger vet_profiles_protect_verification before update on public.veterinarian_profiles
  for each row execute procedure public.protect_verification_fields();
drop trigger if exists company_profiles_protect_verification on public.company_profiles;
create trigger company_profiles_protect_verification before update on public.company_profiles
  for each row execute procedure public.protect_verification_fields();

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.veterinarian_profiles enable row level security;
alter table public.company_profiles enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles for select to authenticated
using ((select auth.uid()) = id or public.is_admin());
drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin" on public.profiles for update to authenticated
using ((select auth.uid()) = id or public.is_admin())
with check ((select auth.uid()) = id or public.is_admin());

drop policy if exists "roles_select_own_or_admin" on public.user_roles;
create policy "roles_select_own_or_admin" on public.user_roles for select to authenticated
using ((select auth.uid()) = user_id or public.is_admin());
drop policy if exists "roles_admin_manage" on public.user_roles;
create policy "roles_admin_manage" on public.user_roles for all to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "vets_public_approved" on public.veterinarian_profiles;
create policy "vets_public_approved" on public.veterinarian_profiles for select to anon, authenticated
using (verification_status = 'approved' or (select auth.uid()) = user_id or public.is_admin());
drop policy if exists "vets_owner_or_admin_update" on public.veterinarian_profiles;
create policy "vets_owner_or_admin_update" on public.veterinarian_profiles for update to authenticated
using ((select auth.uid()) = user_id or public.is_admin())
with check ((select auth.uid()) = user_id or public.is_admin());

drop policy if exists "companies_public_approved" on public.company_profiles;
create policy "companies_public_approved" on public.company_profiles for select to anon, authenticated
using (verification_status = 'approved' or (select auth.uid()) = user_id or public.is_admin());
drop policy if exists "companies_owner_or_admin_update" on public.company_profiles;
create policy "companies_owner_or_admin_update" on public.company_profiles for update to authenticated
using ((select auth.uid()) = user_id or public.is_admin())
with check ((select auth.uid()) = user_id or public.is_admin());

drop policy if exists "audit_admin_select" on public.audit_logs;
create policy "audit_admin_select" on public.audit_logs for select to authenticated
using (public.is_admin());
drop policy if exists "audit_admin_insert" on public.audit_logs;
create policy "audit_admin_insert" on public.audit_logs for insert to authenticated
with check (public.is_admin() and actor_id = (select auth.uid()));

grant usage on schema public to anon, authenticated;
grant select on public.veterinarian_profiles, public.company_profiles to anon;
grant select, update on public.profiles, public.veterinarian_profiles, public.company_profiles to authenticated;
grant select, insert, update, delete on public.user_roles to authenticated;
grant select, insert on public.audit_logs to authenticated;
grant execute on function public.is_admin(uuid) to anon, authenticated;

-- After registering the first trusted administrator, run these two statements
-- with the administrator's actual email address in the SQL Editor:
-- update public.profiles set primary_role = 'super_admin' where email = 'admin@example.com';
-- insert into public.user_roles (user_id, role)
-- select id, 'super_admin' from public.profiles where email = 'admin@example.com'
-- on conflict do nothing;
