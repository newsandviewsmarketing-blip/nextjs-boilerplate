-- VetConnect Pakistan Phase 3 foundation
-- Run after 202608110001_phase3_roles.sql.
-- Adds privacy-safe public views, distinct veterinary credential review,
-- professionals, clinics and diagnostic laboratories.

begin;

do $$ begin
  create type public.profile_visibility as enum (
    'public',
    'registered_users',
    'authorized_company',
    'admin_only',
    'owner_only'
  );
exception when duplicate_object then null;
end $$;

alter table public.veterinarian_profiles
  add column if not exists public_summary text,
  add column if not exists province text,
  add column if not exists image_url text,
  add column if not exists pvmc_verification_status public.approval_status not null default 'pending',
  add column if not exists pvmc_verified_at timestamptz,
  add column if not exists pvmc_verified_by uuid references public.profiles(id) on delete set null;

create table if not exists public.professional_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  slug text not null unique,
  professional_type text not null default 'Animal Health Professional',
  headline text,
  public_summary text,
  current_position text,
  organization_name text,
  city text,
  district text,
  province text,
  years_experience integer not null default 0 check (years_experience >= 0),
  skills text[] not null default '{}',
  image_url text,
  profile_visibility public.profile_visibility not null default 'owner_only',
  verification_status public.approval_status not null default 'pending',
  rejection_reason text,
  verified_at timestamptz,
  verified_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.professional_credentials (
  id uuid primary key default gen_random_uuid(),
  professional_user_id uuid not null references public.professional_profiles(user_id) on delete cascade,
  credential_type text not null,
  issuing_authority text,
  credential_number text,
  evidence_path text,
  verification_status public.approval_status not null default 'pending',
  verification_source text,
  verified_at timestamptz,
  verified_by uuid references public.profiles(id) on delete set null,
  private_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.professional_education (
  id uuid primary key default gen_random_uuid(),
  professional_user_id uuid not null references public.professional_profiles(user_id) on delete cascade,
  degree text not null,
  institution text,
  field_of_study text,
  start_date date,
  end_date date,
  is_current boolean not null default false,
  visibility public.profile_visibility not null default 'owner_only',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.professional_experience (
  id uuid primary key default gen_random_uuid(),
  professional_user_id uuid not null references public.professional_profiles(user_id) on delete cascade,
  organization_name text not null,
  designation text not null,
  responsibilities text,
  start_date date,
  end_date date,
  is_current boolean not null default false,
  visibility public.profile_visibility not null default 'owner_only',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.career_documents (
  id uuid primary key default gen_random_uuid(),
  professional_user_id uuid not null references public.professional_profiles(user_id) on delete cascade,
  document_type text not null default 'cv',
  file_path text not null,
  template_type text,
  visibility public.profile_visibility not null default 'owner_only',
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clinics (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  slug text not null unique,
  clinic_name text not null,
  facility_type text not null default 'Veterinary Clinic',
  description text,
  city text,
  district text,
  province text,
  address text,
  public_phone text,
  public_email text,
  website text,
  working_hours text,
  emergency_service boolean not null default false,
  services text[] not null default '{}',
  species text[] not null default '{}',
  verification_status public.approval_status not null default 'pending',
  rejection_reason text,
  is_published boolean not null default false,
  verified_at timestamptz,
  verified_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clinic_members (
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  professional_user_id uuid not null references public.profiles(id) on delete cascade,
  designation text,
  is_public boolean not null default false,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (clinic_id, professional_user_id)
);

create table if not exists public.laboratories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  slug text not null unique,
  laboratory_name text not null,
  laboratory_type text not null default 'Diagnostic Laboratory',
  description text,
  technical_head text,
  city text,
  district text,
  province text,
  address text,
  public_phone text,
  public_email text,
  website text,
  working_hours text,
  emergency_service boolean not null default false,
  species_served text[] not null default '{}',
  tests_offered text[] not null default '{}',
  verification_status public.approval_status not null default 'pending',
  accreditation_verification_status public.approval_status not null default 'pending',
  rejection_reason text,
  is_published boolean not null default false,
  verified_at timestamptz,
  verified_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.laboratory_locations (
  id uuid primary key default gen_random_uuid(),
  laboratory_id uuid not null references public.laboratories(id) on delete cascade,
  location_type text not null default 'Branch',
  branch_name text,
  address text,
  city text,
  district text,
  province text,
  public_phone text,
  working_hours text,
  sample_collection boolean not null default false,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.laboratory_tests (
  id uuid primary key default gen_random_uuid(),
  laboratory_id uuid not null references public.laboratories(id) on delete cascade,
  test_name text not null,
  test_category text,
  species text[] not null default '{}',
  sample_type text,
  turnaround_time text,
  public_notes text,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.laboratory_accreditations (
  id uuid primary key default gen_random_uuid(),
  laboratory_id uuid not null references public.laboratories(id) on delete cascade,
  authority_name text not null,
  accreditation_type text not null,
  reference_number text,
  valid_from date,
  valid_until date,
  evidence_path text,
  verification_status public.approval_status not null default 'pending',
  verified_at timestamptz,
  verified_by uuid references public.profiles(id) on delete set null,
  private_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.professional_profiles (
  user_id,
  slug,
  professional_type,
  city,
  profile_visibility
)
select
  p.id,
  trim(both '-' from regexp_replace(lower(coalesce(nullif(p.full_name, ''), 'candidate')), '[^a-z0-9]+', '-', 'g')) || '-' || left(p.id::text, 8),
  'Student / Job Seeker',
  p.city,
  'owner_only'::public.profile_visibility
from public.profiles p
where p.primary_role = 'candidate'
on conflict (user_id) do nothing;

create index if not exists professional_profiles_public_idx on public.professional_profiles(verification_status, profile_visibility, city, professional_type);
create index if not exists professional_credentials_owner_idx on public.professional_credentials(professional_user_id, verification_status);
create index if not exists clinics_public_idx on public.clinics(verification_status, is_published, city, facility_type);
create index if not exists laboratories_public_idx on public.laboratories(verification_status, is_published, city, laboratory_type);
create index if not exists laboratory_tests_lab_idx on public.laboratory_tests(laboratory_id, is_available);

create or replace function public.slug_token(input text)
returns text
language sql
immutable
set search_path = public
as $$
  select trim(both '-' from regexp_replace(lower(coalesce(input, '')), '[^a-z0-9]+', '-', 'g'));
$$;

create or replace function public.protect_veterinarian_verification_fields()
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
      new.verified_by is distinct from old.verified_by or
      new.pvmc_verification_status is distinct from old.pvmc_verification_status or
      new.pvmc_verified_at is distinct from old.pvmc_verified_at or
      new.pvmc_verified_by is distinct from old.pvmc_verified_by
    ) then
    raise exception 'Only an authorized administrator can review a veterinarian';
  end if;
  return new;
end;
$$;

drop trigger if exists vet_profiles_protect_verification on public.veterinarian_profiles;
create trigger vet_profiles_protect_verification before update on public.veterinarian_profiles
  for each row execute procedure public.protect_veterinarian_verification_fields();

drop trigger if exists professional_profiles_set_updated_at on public.professional_profiles;
create trigger professional_profiles_set_updated_at before update on public.professional_profiles for each row execute procedure public.set_updated_at();
drop trigger if exists professional_credentials_set_updated_at on public.professional_credentials;
create trigger professional_credentials_set_updated_at before update on public.professional_credentials for each row execute procedure public.set_updated_at();
drop trigger if exists professional_education_set_updated_at on public.professional_education;
create trigger professional_education_set_updated_at before update on public.professional_education for each row execute procedure public.set_updated_at();
drop trigger if exists professional_experience_set_updated_at on public.professional_experience;
create trigger professional_experience_set_updated_at before update on public.professional_experience for each row execute procedure public.set_updated_at();
drop trigger if exists career_documents_set_updated_at on public.career_documents;
create trigger career_documents_set_updated_at before update on public.career_documents for each row execute procedure public.set_updated_at();
drop trigger if exists clinics_set_updated_at on public.clinics;
create trigger clinics_set_updated_at before update on public.clinics for each row execute procedure public.set_updated_at();
drop trigger if exists laboratories_set_updated_at on public.laboratories;
create trigger laboratories_set_updated_at before update on public.laboratories for each row execute procedure public.set_updated_at();
drop trigger if exists laboratory_locations_set_updated_at on public.laboratory_locations;
create trigger laboratory_locations_set_updated_at before update on public.laboratory_locations for each row execute procedure public.set_updated_at();
drop trigger if exists laboratory_tests_set_updated_at on public.laboratory_tests;
create trigger laboratory_tests_set_updated_at before update on public.laboratory_tests for each row execute procedure public.set_updated_at();
drop trigger if exists laboratory_accreditations_set_updated_at on public.laboratory_accreditations;
create trigger laboratory_accreditations_set_updated_at before update on public.laboratory_accreditations for each row execute procedure public.set_updated_at();

drop trigger if exists professional_profiles_protect_verification on public.professional_profiles;
create trigger professional_profiles_protect_verification before update on public.professional_profiles for each row execute procedure public.protect_verification_fields();
drop trigger if exists clinics_protect_verification on public.clinics;
create trigger clinics_protect_verification before update on public.clinics for each row execute procedure public.protect_product_approval_fields();

create or replace function public.protect_laboratory_review_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user not in ('postgres', 'service_role', 'supabase_admin')
    and not public.is_admin() and (
      new.verification_status is distinct from old.verification_status or
      new.accreditation_verification_status is distinct from old.accreditation_verification_status or
      new.rejection_reason is distinct from old.rejection_reason or
      new.is_published is distinct from old.is_published or
      new.verified_at is distinct from old.verified_at or
      new.verified_by is distinct from old.verified_by
    ) then
    raise exception 'Only an authorized administrator can review a laboratory';
  end if;
  return new;
end;
$$;

drop trigger if exists laboratories_protect_verification on public.laboratories;
create trigger laboratories_protect_verification before update on public.laboratories for each row execute procedure public.protect_laboratory_review_fields();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text;
  safe_role public.account_role;
  generated_slug text;
begin
  requested_role := coalesce(new.raw_user_meta_data ->> 'role', 'user');
  safe_role := case requested_role
    when 'veterinarian' then 'veterinarian'::public.account_role
    when 'company' then 'company'::public.account_role
    when 'candidate' then 'candidate'::public.account_role
    when 'professional' then 'professional'::public.account_role
    when 'laboratory' then 'laboratory'::public.account_role
    else 'user'::public.account_role
  end;
  generated_slug := public.slug_token(coalesce(new.raw_user_meta_data ->> 'organization_name', new.raw_user_meta_data ->> 'full_name', 'profile')) || '-' || left(new.id::text, 8);

  insert into public.profiles (id, email, full_name, phone, city, primary_role)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data ->> 'full_name', ''), nullif(new.raw_user_meta_data ->> 'phone', ''), nullif(new.raw_user_meta_data ->> 'city', ''), safe_role)
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, safe_role) on conflict do nothing;

  if safe_role = 'veterinarian' then
    insert into public.veterinarian_profiles (user_id, pvmc_number, city)
    values (new.id, nullif(new.raw_user_meta_data ->> 'pvmc_number', ''), nullif(new.raw_user_meta_data ->> 'city', '')) on conflict (user_id) do nothing;
  elsif safe_role = 'company' then
    insert into public.company_profiles (user_id, company_name, city)
    values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'organization_name', ''), new.raw_user_meta_data ->> 'full_name', ''), nullif(new.raw_user_meta_data ->> 'city', '')) on conflict (user_id) do nothing;
  elsif safe_role = 'professional' or safe_role = 'candidate' then
    insert into public.professional_profiles (user_id, slug, professional_type, city)
    values (new.id, generated_slug, case when safe_role = 'candidate' then 'Student / Job Seeker' else 'Animal Health Professional' end, nullif(new.raw_user_meta_data ->> 'city', '')) on conflict (user_id) do nothing;
  elsif safe_role = 'laboratory' then
    insert into public.laboratories (owner_id, slug, laboratory_name, city)
    values (new.id, generated_slug, coalesce(nullif(new.raw_user_meta_data ->> 'organization_name', ''), new.raw_user_meta_data ->> 'full_name', 'Laboratory'), nullif(new.raw_user_meta_data ->> 'city', ''));
  end if;
  return new;
end;
$$;

alter table public.professional_profiles enable row level security;
alter table public.professional_credentials enable row level security;
alter table public.professional_education enable row level security;
alter table public.professional_experience enable row level security;
alter table public.career_documents enable row level security;
alter table public.clinics enable row level security;
alter table public.clinic_members enable row level security;
alter table public.laboratories enable row level security;
alter table public.laboratory_locations enable row level security;
alter table public.laboratory_tests enable row level security;
alter table public.laboratory_accreditations enable row level security;

drop policy if exists "vets_owner_or_admin_select" on public.veterinarian_profiles;
create policy "vets_owner_or_admin_select" on public.veterinarian_profiles for select to authenticated using ((select auth.uid()) = user_id or public.is_admin());
drop policy if exists "companies_owner_or_admin_select" on public.company_profiles;
create policy "companies_owner_or_admin_select" on public.company_profiles for select to authenticated using ((select auth.uid()) = user_id or public.is_admin());

drop policy if exists "professional_owner_or_admin_select" on public.professional_profiles;
create policy "professional_owner_or_admin_select" on public.professional_profiles for select to authenticated using ((select auth.uid()) = user_id or public.is_admin());
drop policy if exists "professional_owner_or_admin_update" on public.professional_profiles;
create policy "professional_owner_or_admin_update" on public.professional_profiles for update to authenticated using ((select auth.uid()) = user_id or public.is_admin()) with check ((select auth.uid()) = user_id or public.is_admin());
drop policy if exists "professional_children_owner_or_admin" on public.professional_credentials;
create policy "professional_children_owner_or_admin" on public.professional_credentials for all to authenticated using (professional_user_id = (select auth.uid()) or public.is_admin()) with check (professional_user_id = (select auth.uid()) or public.is_admin());
drop policy if exists "professional_education_owner_or_admin" on public.professional_education;
create policy "professional_education_owner_or_admin" on public.professional_education for all to authenticated using (professional_user_id = (select auth.uid()) or public.is_admin()) with check (professional_user_id = (select auth.uid()) or public.is_admin());
drop policy if exists "professional_experience_owner_or_admin" on public.professional_experience;
create policy "professional_experience_owner_or_admin" on public.professional_experience for all to authenticated using (professional_user_id = (select auth.uid()) or public.is_admin()) with check (professional_user_id = (select auth.uid()) or public.is_admin());
drop policy if exists "career_documents_owner_or_admin" on public.career_documents;
create policy "career_documents_owner_or_admin" on public.career_documents for all to authenticated using (professional_user_id = (select auth.uid()) or public.is_admin()) with check (professional_user_id = (select auth.uid()) or public.is_admin());

drop policy if exists "clinics_owner_or_admin" on public.clinics;
create policy "clinics_owner_or_admin" on public.clinics for all to authenticated using (owner_id = (select auth.uid()) or public.is_admin()) with check (owner_id = (select auth.uid()) or public.is_admin());
drop policy if exists "clinic_members_owner_or_admin" on public.clinic_members;
create policy "clinic_members_owner_or_admin" on public.clinic_members for all to authenticated using (exists (select 1 from public.clinics c where c.id = clinic_members.clinic_id and (c.owner_id = (select auth.uid()) or public.is_admin()))) with check (exists (select 1 from public.clinics c where c.id = clinic_members.clinic_id and (c.owner_id = (select auth.uid()) or public.is_admin())));
drop policy if exists "laboratories_owner_or_admin" on public.laboratories;
create policy "laboratories_owner_or_admin" on public.laboratories for all to authenticated using (owner_id = (select auth.uid()) or public.is_admin()) with check (owner_id = (select auth.uid()) or public.is_admin());
drop policy if exists "laboratory_locations_owner_or_admin" on public.laboratory_locations;
create policy "laboratory_locations_owner_or_admin" on public.laboratory_locations for all to authenticated using (exists (select 1 from public.laboratories l where l.id = laboratory_locations.laboratory_id and (l.owner_id = (select auth.uid()) or public.is_admin()))) with check (exists (select 1 from public.laboratories l where l.id = laboratory_locations.laboratory_id and (l.owner_id = (select auth.uid()) or public.is_admin())));
drop policy if exists "laboratory_tests_owner_or_admin" on public.laboratory_tests;
create policy "laboratory_tests_owner_or_admin" on public.laboratory_tests for all to authenticated using (exists (select 1 from public.laboratories l where l.id = laboratory_tests.laboratory_id and (l.owner_id = (select auth.uid()) or public.is_admin()))) with check (exists (select 1 from public.laboratories l where l.id = laboratory_tests.laboratory_id and (l.owner_id = (select auth.uid()) or public.is_admin())));
drop policy if exists "laboratory_accreditations_owner_or_admin" on public.laboratory_accreditations;
create policy "laboratory_accreditations_owner_or_admin" on public.laboratory_accreditations for all to authenticated using (exists (select 1 from public.laboratories l where l.id = laboratory_accreditations.laboratory_id and (l.owner_id = (select auth.uid()) or public.is_admin()))) with check (exists (select 1 from public.laboratories l where l.id = laboratory_accreditations.laboratory_id and (l.owner_id = (select auth.uid()) or public.is_admin())));

create or replace view public.public_veterinarians with (security_barrier = true) as
select v.user_id, p.full_name, v.qualifications, v.specialization, v.years_experience, coalesce(v.city, p.city) as city, v.services, true as profile_verified, true as pvmc_verified, v.image_url
from public.veterinarian_profiles v join public.profiles p on p.id = v.user_id
where p.account_status = 'active' and v.verification_status = 'approved' and v.pvmc_verification_status = 'approved';

create or replace view public.public_companies with (security_barrier = true) as
select c.user_id, c.company_name, c.business_type, c.city, c.address, c.description, c.website, c.contact_email, c.logo_url
from public.company_profiles c join public.profiles p on p.id = c.user_id
where p.account_status = 'active' and c.verification_status = 'approved';

create or replace view public.public_professionals with (security_barrier = true) as
select pp.user_id, pp.slug, p.full_name, pp.professional_type, pp.headline, pp.current_position, pp.organization_name, coalesce(pp.city, p.city) as city, pp.province, pp.years_experience, pp.skills, true as profile_verified, pp.image_url
from public.professional_profiles pp join public.profiles p on p.id = pp.user_id
where p.account_status = 'active' and pp.verification_status = 'approved' and pp.profile_visibility = 'public';

create or replace view public.public_clinics with (security_barrier = true) as
select id, slug, clinic_name, facility_type, description, city, province, address, public_phone, public_email, website, working_hours, emergency_service, services, species, true as profile_verified
from public.clinics where verification_status = 'approved' and is_published;

create or replace view public.public_laboratories with (security_barrier = true) as
select id, slug, laboratory_name, laboratory_type, description, city, province, address, public_phone, public_email, website, working_hours, emergency_service, species_served, tests_offered, true as profile_verified, accreditation_verification_status = 'approved' as accreditation_verified
from public.laboratories where verification_status = 'approved' and is_published;

grant select on public.public_veterinarians, public.public_companies, public.public_professionals, public.public_clinics, public.public_laboratories to anon, authenticated;
grant select, insert, update, delete on public.professional_profiles, public.professional_credentials, public.professional_education, public.professional_experience, public.career_documents, public.clinics, public.clinic_members, public.laboratories, public.laboratory_locations, public.laboratory_tests, public.laboratory_accreditations to authenticated;

commit;
