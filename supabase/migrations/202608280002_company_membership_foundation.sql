begin;

-- =========================================================
-- VetConnect Company Membership Foundation
--
-- Adds a canonical company identity and user-to-company
-- membership layer without changing the existing
-- company_profiles / products / jobs architecture.
-- =========================================================


-- ---------------------------------------------------------
-- 1. Canonical company entity
-- ---------------------------------------------------------

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),

  -- Temporary bridge to the existing company_profiles model.
  -- One legacy company profile maps to one canonical company.
  legacy_company_user_id uuid unique
    references public.company_profiles(user_id)
    on delete restrict,

  canonical_name text not null,
  legal_name text,
  trade_name text,
  slug text unique,

  country text not null default 'Pakistan',

  verification_status public.approval_status
    not null default 'pending',

  record_status text not null default 'active'
    check (
      record_status in (
        'active',
        'inactive',
        'closed',
        'archived'
      )
    ),

  created_by uuid
    references public.profiles(id)
    on delete set null,

  verified_at timestamptz,
  verified_by uuid
    references public.profiles(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create index if not exists companies_canonical_name_idx
  on public.companies (lower(canonical_name));

create index if not exists companies_country_idx
  on public.companies (country);

create index if not exists companies_verification_status_idx
  on public.companies (verification_status);


-- ---------------------------------------------------------
-- 2. Company membership / employment / management relation
-- ---------------------------------------------------------

create table if not exists public.company_members (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  user_id uuid not null
    references public.profiles(id)
    on delete cascade,

  -- Examples:
  -- owner, administrator, hr_manager, recruiter,
  -- product_manager, sales_manager, technical_manager,
  -- employee, consultant
  member_role text not null default 'employee',

  designation text,
  department text,

  -- Scoped abilities for this specific company.
  -- Examples:
  -- company.manage
  -- members.manage
  -- jobs.manage
  -- applicants.manage
  -- products.manage
  -- company.view_private
  permissions text[] not null default '{}'::text[],

  relationship_type text not null default 'employee',

  membership_status text not null default 'pending'
    check (
      membership_status in (
        'pending',
        'active',
        'inactive',
        'ended',
        'rejected',
        'suspended'
      )
    ),

  verification_status public.approval_status
    not null default 'pending',

  -- How the relationship originated.
  claim_source text not null default 'self_claim'
    check (
      claim_source in (
        'owner_created',
        'owner_added',
        'company_invitation',
        'self_claim',
        'admin_added'
      )
    ),

  start_date date,
  end_date date,

  is_current boolean not null default true,
  is_public boolean not null default false,
  is_primary boolean not null default false,

  invited_by uuid
    references public.profiles(id)
    on delete set null,

  confirmed_by uuid
    references public.profiles(id)
    on delete set null,

  confirmed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (company_id, user_id)
);


create index if not exists company_members_user_id_idx
  on public.company_members (user_id);

create index if not exists company_members_company_id_idx
  on public.company_members (company_id);

create index if not exists company_members_status_idx
  on public.company_members (membership_status);

create index if not exists company_members_role_idx
  on public.company_members (member_role);


-- ---------------------------------------------------------
-- 3. Backfill current company_profiles into canonical companies
-- ---------------------------------------------------------

insert into public.companies (
  legacy_company_user_id,
  canonical_name,
  legal_name,
  trade_name,
  slug,
  country,
  verification_status,
  created_by,
  verified_at,
  verified_by,
  created_at,
  updated_at
)
select
  cp.user_id,
  coalesce(
    nullif(cp.legal_name, ''),
    nullif(cp.trade_name, ''),
    nullif(cp.company_name, ''),
    'Unnamed Company'
  ),
  cp.legal_name,
  cp.trade_name,
  cp.slug,
  cp.country,
  cp.verification_status,
  cp.user_id,
  cp.verified_at,
  cp.verified_by,
  cp.created_at,
  cp.updated_at
from public.company_profiles cp
where not exists (
  select 1
  from public.companies c
  where c.legacy_company_user_id = cp.user_id
);


-- ---------------------------------------------------------
-- 4. Existing company account becomes founding owner/member
-- ---------------------------------------------------------

insert into public.company_members (
  company_id,
  user_id,
  member_role,
  designation,
  permissions,
  relationship_type,
  membership_status,
  verification_status,
  claim_source,
  is_current,
  is_public,
  is_primary,
  confirmed_by,
  confirmed_at
)
select
  c.id,
  cp.user_id,
  'owner',
  coalesce(
    nullif(cp.owner_name, ''),
    'Owner'
  ),
  array[
    'company.manage',
    'members.manage',
    'jobs.manage',
    'applicants.manage',
    'products.manage',
    'company.view_private'
  ]::text[],
  'owner',
  'active',
  'approved'::public.approval_status,
  'owner_created',
  true,
  true,
  true,
  cp.user_id,
  now()
from public.company_profiles cp
join public.companies c
  on c.legacy_company_user_id = cp.user_id
where not exists (
  select 1
  from public.company_members cm
  where cm.company_id = c.id
    and cm.user_id = cp.user_id
);


-- ---------------------------------------------------------
-- 5. Updated-at triggers
-- Existing project already contains public.set_updated_at()
-- ---------------------------------------------------------

drop trigger if exists companies_set_updated_at
  on public.companies;

create trigger companies_set_updated_at
before update on public.companies
for each row
execute function public.set_updated_at();


drop trigger if exists company_members_set_updated_at
  on public.company_members;

create trigger company_members_set_updated_at
before update on public.company_members
for each row
execute function public.set_updated_at();


-- ---------------------------------------------------------
-- 6. Security foundation
--
-- Keep new tables private until the next permission migration.
-- This prevents accidental exposure while we build the
-- owner/HR/recruiter/product-manager workflows.
-- ---------------------------------------------------------

alter table public.companies enable row level security;
alter table public.company_members enable row level security;


drop policy if exists companies_admin_foundation_access
  on public.companies;

create policy companies_admin_foundation_access
on public.companies
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());


drop policy if exists company_members_admin_foundation_access
  on public.company_members;

create policy company_members_admin_foundation_access
on public.company_members
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());


commit;
