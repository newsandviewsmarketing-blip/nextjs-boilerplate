begin;

-- ============================================================
-- VetConnect
-- Professional <-> Canonical Company Linkage
--
-- Goals:
-- 1. Preserve all existing professional experience records.
-- 2. Allow a professional to select a canonical VetConnect company.
-- 3. Allow an approved company membership to verify employment.
-- 4. Prevent users from manually spoofing verified company links.
-- 5. Keep historical/unregistered organizations as free text.
-- ============================================================


-- ============================================================
-- 1. ADD CANONICAL COMPANY LINKAGE TO PROFESSIONAL EXPERIENCE
-- ============================================================

alter table public.professional_experience
  add column if not exists company_id uuid;

alter table public.professional_experience
  add column if not exists company_member_id uuid;

alter table public.professional_experience
  add column if not exists organization_source text
    not null default 'self_reported';

alter table public.professional_experience
  add column if not exists company_linked_at timestamptz;

alter table public.professional_experience
  add column if not exists company_linked_by uuid;


-- ============================================================
-- 2. FOREIGN KEYS
-- ============================================================

do $$
begin

  if not exists (
    select 1
    from pg_constraint
    where conname = 'professional_experience_company_id_fkey'
      and conrelid = 'public.professional_experience'::regclass
  ) then
    alter table public.professional_experience
      add constraint professional_experience_company_id_fkey
      foreign key (company_id)
      references public.companies(id)
      on delete restrict;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'professional_experience_company_member_id_fkey'
      and conrelid = 'public.professional_experience'::regclass
  ) then
    alter table public.professional_experience
      add constraint professional_experience_company_member_id_fkey
      foreign key (company_member_id)
      references public.company_members(id)
      on delete restrict;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'professional_experience_company_linked_by_fkey'
      and conrelid = 'public.professional_experience'::regclass
  ) then
    alter table public.professional_experience
      add constraint professional_experience_company_linked_by_fkey
      foreign key (company_linked_by)
      references public.profiles(id)
      on delete set null;
  end if;

end
$$;


-- ============================================================
-- 3. SOURCE VALIDATION
--
-- self_reported:
--   Free-text organization, including organizations not registered
--   on VetConnect.
--
-- canonical_company:
--   Professional selected an existing canonical company.
--   This is NOT yet verified employment.
--
-- verified_membership:
--   Experience is linked to an active + approved company membership.
-- ============================================================

do $$
begin

  if not exists (
    select 1
    from pg_constraint
    where conname = 'professional_experience_organization_source_check'
      and conrelid = 'public.professional_experience'::regclass
  ) then
    alter table public.professional_experience
      add constraint professional_experience_organization_source_check
      check (
        organization_source in (
          'self_reported',
          'canonical_company',
          'verified_membership'
        )
      );
  end if;

end
$$;


do $$
begin

  if not exists (
    select 1
    from pg_constraint
    where conname = 'professional_experience_company_link_shape_check'
      and conrelid = 'public.professional_experience'::regclass
  ) then
    alter table public.professional_experience
      add constraint professional_experience_company_link_shape_check
      check (
        (
          organization_source = 'self_reported'
          and company_id is null
          and company_member_id is null
        )
        or
        (
          organization_source = 'canonical_company'
          and company_id is not null
          and company_member_id is null
        )
        or
        (
          organization_source = 'verified_membership'
          and company_id is not null
          and company_member_id is not null
        )
      );
  end if;

end
$$;


-- ============================================================
-- 4. INDEXES
-- ============================================================

create index if not exists
  professional_experience_company_id_idx
on public.professional_experience(company_id);


create index if not exists
  professional_experience_professional_company_idx
on public.professional_experience(
  professional_user_id,
  company_id
);


-- One company membership must not verify multiple CV experience rows.

create unique index if not exists
  professional_experience_company_member_unique_idx
on public.professional_experience(company_member_id)
where company_member_id is not null;


-- ============================================================
-- 5. PROTECT VERIFIED LINKAGE FIELDS
--
-- Existing RLS still controls normal professional experience.
-- These specific company-link fields cannot be manually spoofed.
-- Controlled SECURITY DEFINER functions below manage them.
-- ============================================================

create or replace function
public.protect_professional_experience_company_link()
returns trigger
language plpgsql
set search_path = public
as $$
begin

  -- Trusted database/admin operations may manage linkage fields.
  if current_user in (
    'postgres',
    'service_role',
    'supabase_admin'
  )
  or public.is_admin() then
    return new;
  end if;


  if tg_op = 'INSERT' then

    if
      new.company_id is not null
      or new.company_member_id is not null
      or new.organization_source <> 'self_reported'
      or new.company_linked_at is not null
      or new.company_linked_by is not null
    then
      raise exception
        'Company linkage must be created through the controlled VetConnect workflow';
    end if;

  end if;


  if tg_op = 'UPDATE' then

    if
      new.company_id is distinct from old.company_id
      or new.company_member_id is distinct from old.company_member_id
      or new.organization_source is distinct from old.organization_source
      or new.company_linked_at is distinct from old.company_linked_at
      or new.company_linked_by is distinct from old.company_linked_by
    then
      raise exception
        'Company linkage must be changed through the controlled VetConnect workflow';
    end if;


    -- A canonical linked company name must remain canonical.
    if
      old.organization_source in (
        'canonical_company',
        'verified_membership'
      )
      and new.organization_name is distinct from old.organization_name
    then
      raise exception
        'Linked organization name is managed by the canonical company record';
    end if;

  end if;


  return new;
end;
$$;


drop trigger if exists
  professional_experience_protect_company_link
on public.professional_experience;


create trigger professional_experience_protect_company_link
before insert or update
on public.professional_experience
for each row
execute function
  public.protect_professional_experience_company_link();


-- ============================================================
-- 6. SELECT / LINK A CANONICAL COMPANY
--
-- This prevents spelling duplicates such as:
-- "ABC Pharma"
-- "A.B.C Pharma"
-- "ABC Pharmaceuticals"
--
-- Canonical company selection does NOT by itself mean
-- verified employment.
-- ============================================================

create or replace function
public.set_professional_experience_company(
  p_experience_id uuid,
  p_company_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_professional_user_id uuid;
  v_company_name text;
begin

  if v_actor is null then
    raise exception 'Authentication required';
  end if;


  select pe.professional_user_id
  into v_professional_user_id
  from public.professional_experience pe
  where pe.id = p_experience_id;

  if not found then
    raise exception 'Professional experience record not found';
  end if;


  if
    v_professional_user_id <> v_actor
    and not public.is_admin()
  then
    raise exception
      'You may only link your own professional experience';
  end if;


  select c.canonical_name
  into v_company_name
  from public.companies c
  where c.id = p_company_id
    and c.record_status = 'active'
    and c.verification_status =
      'approved'::public.approval_status;

  if not found then
    raise exception
      'Canonical company is not available for selection';
  end if;


  update public.professional_experience
  set
    company_id = p_company_id,
    company_member_id = null,
    organization_name = v_company_name,
    organization_source = 'canonical_company',
    company_linked_at = now(),
    company_linked_by = v_actor
  where id = p_experience_id;

end;
$$;


revoke all on function
public.set_professional_experience_company(uuid, uuid)
from public;

grant execute on function
public.set_professional_experience_company(uuid, uuid)
to authenticated;


-- ============================================================
-- 7. VERIFY EXPERIENCE THROUGH APPROVED COMPANY MEMBERSHIP
--
-- Requirements:
-- - Experience belongs to the same professional.
-- - Membership belongs to the same professional.
-- - Membership is ACTIVE.
-- - Membership verification is APPROVED.
-- - If an experience already selected a company, it must be
--   the same company as the membership.
-- ============================================================

create or replace function
public.verify_professional_experience_membership(
  p_experience_id uuid,
  p_membership_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();

  v_professional_user_id uuid;
  v_existing_company_id uuid;

  v_membership_user_id uuid;
  v_membership_company_id uuid;
  v_membership_status text;
  v_membership_verification public.approval_status;

  v_company_name text;
begin

  if v_actor is null then
    raise exception 'Authentication required';
  end if;


  select
    pe.professional_user_id,
    pe.company_id
  into
    v_professional_user_id,
    v_existing_company_id
  from public.professional_experience pe
  where pe.id = p_experience_id;

  if not found then
    raise exception 'Professional experience record not found';
  end if;


  if
    v_professional_user_id <> v_actor
    and not public.is_admin()
  then
    raise exception
      'You may only verify your own professional experience';
  end if;


  select
    cm.user_id,
    cm.company_id,
    cm.membership_status,
    cm.verification_status
  into
    v_membership_user_id,
    v_membership_company_id,
    v_membership_status,
    v_membership_verification
  from public.company_members cm
  where cm.id = p_membership_id;

  if not found then
    raise exception 'Company membership not found';
  end if;


  if v_membership_user_id <> v_professional_user_id then
    raise exception
      'Company membership does not belong to this professional';
  end if;


  if v_membership_status <> 'active' then
    raise exception
      'Only an active company membership can verify experience';
  end if;


  if
    v_membership_verification <>
      'approved'::public.approval_status
  then
    raise exception
      'Only an approved company membership can verify experience';
  end if;


  if
    v_existing_company_id is not null
    and v_existing_company_id <> v_membership_company_id
  then
    raise exception
      'Selected company does not match the approved company membership';
  end if;


  select c.canonical_name
  into v_company_name
  from public.companies c
  where c.id = v_membership_company_id;

  if not found then
    raise exception 'Canonical company record not found';
  end if;


  update public.professional_experience
  set
    company_id = v_membership_company_id,
    company_member_id = p_membership_id,
    organization_name = v_company_name,
    organization_source = 'verified_membership',
    company_linked_at = now(),
    company_linked_by = v_actor
  where id = p_experience_id;

end;
$$;


revoke all on function
public.verify_professional_experience_membership(uuid, uuid)
from public;

grant execute on function
public.verify_professional_experience_membership(uuid, uuid)
to authenticated;


-- ============================================================
-- 8. REMOVE VERIFIED MEMBERSHIP LINK
--
-- This removes the verification link but retains the canonical
-- company association.
-- ============================================================

create or replace function
public.remove_professional_experience_verification(
  p_experience_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_professional_user_id uuid;
  v_company_id uuid;
begin

  if v_actor is null then
    raise exception 'Authentication required';
  end if;


  select
    pe.professional_user_id,
    pe.company_id
  into
    v_professional_user_id,
    v_company_id
  from public.professional_experience pe
  where pe.id = p_experience_id;

  if not found then
    raise exception 'Professional experience record not found';
  end if;


  if
    v_professional_user_id <> v_actor
    and not public.is_admin()
  then
    raise exception
      'You may only change your own professional experience';
  end if;


  if v_company_id is null then
    raise exception
      'Professional experience has no canonical company link';
  end if;


  update public.professional_experience
  set
    company_member_id = null,
    organization_source = 'canonical_company',
    company_linked_at = now(),
    company_linked_by = v_actor
  where id = p_experience_id;

end;
$$;


revoke all on function
public.remove_professional_experience_verification(uuid)
from public;

grant execute on function
public.remove_professional_experience_verification(uuid)
to authenticated;


-- ============================================================
-- 9. RETURN TO FREE-TEXT / UNREGISTERED ORGANIZATION
--
-- Useful for historical employers or organizations that are
-- not yet registered in VetConnect.
-- ============================================================

create or replace function
public.clear_professional_experience_company(
  p_experience_id uuid,
  p_organization_name text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_professional_user_id uuid;
begin

  if v_actor is null then
    raise exception 'Authentication required';
  end if;


  select pe.professional_user_id
  into v_professional_user_id
  from public.professional_experience pe
  where pe.id = p_experience_id;

  if not found then
    raise exception 'Professional experience record not found';
  end if;


  if
    v_professional_user_id <> v_actor
    and not public.is_admin()
  then
    raise exception
      'You may only change your own professional experience';
  end if;


  update public.professional_experience
  set
    organization_name = case
      when nullif(btrim(p_organization_name), '') is not null
        then btrim(p_organization_name)
      else organization_name
    end,
    company_id = null,
    company_member_id = null,
    organization_source = 'self_reported',
    company_linked_at = null,
    company_linked_by = null
  where id = p_experience_id;

end;
$$;


revoke all on function
public.clear_professional_experience_company(uuid, text)
from public;

grant execute on function
public.clear_professional_experience_company(uuid, text)
to authenticated;


commit;
