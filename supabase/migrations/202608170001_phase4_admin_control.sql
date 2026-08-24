-- VetConnect Pakistan Phase 4 admin control and product lifecycle
-- Run after the complete Phase 3 migration sequence.

begin;

alter table public.products
  add column if not exists published_at timestamptz,
  add column if not exists published_by uuid references public.profiles(id) on delete set null,
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references public.profiles(id) on delete set null,
  add column if not exists last_edited_by uuid references public.profiles(id) on delete set null;

create index if not exists products_admin_lifecycle_idx
  on public.products(archived_at, verification_status, is_published, updated_at desc);

create table if not exists public.admin_role_permissions (
  role public.account_role primary key,
  hierarchy_level integer not null check (hierarchy_level between 1 and 100),
  display_name text not null,
  description text not null,
  permissions text[] not null default '{}',
  updated_at timestamptz not null default now()
);

insert into public.admin_role_permissions
  (role, hierarchy_level, display_name, description, permissions)
values
  ('super_admin', 100, 'Super Administrator', 'Full platform, user, role, publishing and audit control.', array['admin.view','profiles.review','regulatory.review','products.manage','products.delete','jobs.manage','users.manage','audit.view','analytics.view']),
  ('verification_officer', 70, 'Verification Officer', 'Profiles, professional credentials and regulatory evidence.', array['admin.view','profiles.review','regulatory.review']),
  ('content_admin', 60, 'Marketplace & Content Admin', 'Products, marketplace publishing and job moderation.', array['admin.view','products.manage','jobs.manage']),
  ('career_admin', 50, 'Careers Admin', 'Jobs, applications and recruitment workflows.', array['admin.view','jobs.manage']),
  ('analyst', 20, 'Read-only Analyst', 'Operational metrics and audit visibility without write access.', array['admin.view','audit.view','analytics.view'])
on conflict (role) do update set
  hierarchy_level = excluded.hierarchy_level,
  display_name = excluded.display_name,
  description = excluded.description,
  permissions = excluded.permissions,
  updated_at = now();

create or replace function public.is_super_admin(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = check_user_id and role = 'super_admin'
  );
$$;

-- Legacy policies call is_admin(). Phase 4 intentionally narrows that broad
-- function to Super Administrator. Specialist staff use explicit permission
-- functions and policies below.
create or replace function public.is_admin(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_super_admin(check_user_id);
$$;

create or replace function public.has_admin_permission(
  check_permission text,
  check_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.admin_role_permissions arp on arp.role = ur.role
    where ur.user_id = check_user_id
      and check_permission = any(arp.permissions)
  );
$$;

create or replace function public.can_manage_jobs(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_admin_permission('jobs.manage', check_user_id);
$$;

create or replace function public.protect_profile_permissions()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user not in ('postgres', 'service_role', 'supabase_admin')
    and not public.is_super_admin() and (
      new.primary_role is distinct from old.primary_role or
      new.account_status is distinct from old.account_status or
      new.email is distinct from old.email
    ) then
    raise exception 'Only a Super Administrator can change role or account status';
  end if;
  return new;
end;
$$;

create or replace function public.protect_product_approval_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user not in ('postgres', 'service_role', 'supabase_admin')
    and not public.can_manage_content() and (
      new.verification_status is distinct from old.verification_status or
      new.rejection_reason is distinct from old.rejection_reason or
      new.is_published is distinct from old.is_published or
      new.verified_at is distinct from old.verified_at or
      new.verified_by is distinct from old.verified_by or
      new.published_at is distinct from old.published_at or
      new.published_by is distinct from old.published_by or
      new.archived_at is distinct from old.archived_at or
      new.archived_by is distinct from old.archived_by
    ) then
    raise exception 'Only an authorized marketplace administrator can review or publish this product';
  end if;

  if current_user not in ('postgres', 'service_role', 'supabase_admin')
    and not public.can_manage_content()
    and (
      to_jsonb(new) - array['updated_at','last_edited_by','verification_status','rejection_reason','is_published','verified_at','verified_by','published_at','published_by','archived_at','archived_by']
    ) is distinct from (
      to_jsonb(old) - array['updated_at','last_edited_by','verification_status','rejection_reason','is_published','verified_at','verified_by','published_at','published_by','archived_at','archived_by']
    ) then
    new.verification_status := 'pending';
    new.rejection_reason := null;
    new.is_published := false;
    new.verified_at := null;
    new.verified_by := null;
    new.published_at := null;
    new.published_by := null;
  end if;
  return new;
end;
$$;

create or replace function public.protect_job_approval_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user not in ('postgres', 'service_role', 'supabase_admin')
    and not public.can_manage_jobs() and (
      new.verification_status is distinct from old.verification_status or
      new.is_published is distinct from old.is_published
    ) then
    raise exception 'Only an authorized careers or content administrator can review or publish a job';
  end if;
  if current_user not in ('postgres', 'service_role', 'supabase_admin')
    and not public.can_manage_jobs()
    and (to_jsonb(new) - array['updated_at','verification_status','is_published'])
      is distinct from (to_jsonb(old) - array['updated_at','verification_status','is_published']) then
    new.verification_status := 'pending';
    new.is_published := false;
  end if;
  return new;
end;
$$;

alter table public.admin_role_permissions enable row level security;

drop policy if exists "admin_role_permissions_staff_read" on public.admin_role_permissions;
create policy "admin_role_permissions_staff_read"
on public.admin_role_permissions for select to authenticated
using (public.has_admin_permission('admin.view'));

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles for select to authenticated
using ((select auth.uid()) = id or public.is_super_admin());

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin" on public.profiles for update to authenticated
using ((select auth.uid()) = id or public.is_super_admin())
with check ((select auth.uid()) = id or public.is_super_admin());

drop policy if exists "roles_select_own_or_admin" on public.user_roles;
create policy "roles_select_own_or_admin" on public.user_roles for select to authenticated
using ((select auth.uid()) = user_id or public.is_super_admin());

drop policy if exists "roles_admin_manage" on public.user_roles;
create policy "roles_admin_manage" on public.user_roles for all to authenticated
using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "jobs_content_manage" on public.jobs;
create policy "jobs_content_manage" on public.jobs for all to authenticated
using (public.can_manage_jobs()) with check (public.can_manage_jobs());

drop policy if exists "products_content_manage" on public.products;
create policy "products_content_manage" on public.products for all to authenticated
using (public.can_manage_content()) with check (public.can_manage_content());

drop policy if exists "audit_admin_select" on public.audit_logs;
drop policy if exists "audit_staff_select" on public.audit_logs;
create policy "audit_staff_select" on public.audit_logs for select to authenticated
using (
  actor_id = (select auth.uid())
  or public.is_super_admin()
  or public.has_account_role('analyst')
);

drop policy if exists "audit_owner_activity_insert" on public.audit_logs;
create policy "audit_owner_activity_insert" on public.audit_logs for insert to authenticated
with check (
  actor_id = (select auth.uid())
  and action in ('product.submitted', 'product.owner_updated', 'job.submitted')
);

grant select on public.admin_role_permissions to authenticated;
grant execute on function public.is_super_admin(uuid), public.has_admin_permission(text, uuid), public.can_manage_jobs(uuid) to authenticated;

commit;
