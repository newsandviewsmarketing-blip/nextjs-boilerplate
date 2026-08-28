begin;

-- ============================================================
-- VetConnect
-- Jobs ↔ Canonical Company Membership Foundation
--
-- Adds canonical company ownership to jobs while preserving
-- legacy company_user_id for frontend/backward compatibility.
--
-- Company members with jobs.manage may manage company jobs.
-- Global jobs administrators retain existing control.
-- ============================================================


-- ============================================================
-- 1. ADD CANONICAL COMPANY LINK
-- ============================================================

alter table public.jobs
  add column if not exists company_id uuid;


-- Backfill legacy jobs where possible.

update public.jobs j
set company_id = c.id
from public.companies c
where j.company_id is null
  and c.legacy_company_user_id = j.company_user_id;


-- Do not continue if any existing job cannot be mapped safely.

do $$
begin
  if exists (
    select 1
    from public.jobs
    where company_id is null
  ) then
    raise exception
      'Cannot harden jobs: one or more jobs have no canonical company mapping';
  end if;
end
$$;


alter table public.jobs
  alter column company_id set not null;


do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.jobs'::regclass
      and conname = 'jobs_company_id_fkey'
  ) then
    alter table public.jobs
      add constraint jobs_company_id_fkey
      foreign key (company_id)
      references public.companies(id)
      on delete restrict;
  end if;
end
$$;


create index if not exists jobs_company_id_idx
on public.jobs(company_id);


-- ============================================================
-- 2. KEEP LEGACY + CANONICAL COMPANY IDENTITY CONSISTENT
--
-- Supports:
-- A) existing frontend sending company_user_id
-- B) future frontend sending canonical company_id
--
-- During transition both values are kept aligned.
-- ============================================================

create or replace function public.sync_job_company_identity()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_company_id uuid;
  v_legacy_company_user_id uuid;
begin

  -- ----------------------------------------------------------
  -- If canonical company_id is supplied, derive legacy owner.
  -- ----------------------------------------------------------

  if new.company_id is not null then

    select
      c.legacy_company_user_id
    into
      v_legacy_company_user_id
    from public.companies c
    where c.id = new.company_id;

    if not found then
      raise exception 'Canonical company not found';
    end if;

    if v_legacy_company_user_id is null then
      raise exception
        'Canonical company has no legacy company profile linkage';
    end if;

    if new.company_user_id is null then
      new.company_user_id := v_legacy_company_user_id;

    elsif new.company_user_id <> v_legacy_company_user_id then
      raise exception
        'Job company_id and company_user_id do not identify the same company';
    end if;

    return new;

  end if;


  -- ----------------------------------------------------------
  -- Backward-compatible path:
  -- existing frontend supplies company_user_id.
  -- ----------------------------------------------------------

  select
    c.id
  into
    v_company_id
  from public.companies c
  where c.legacy_company_user_id = new.company_user_id;

  if not found then
    raise exception
      'A canonical company record is required before creating a job';
  end if;

  new.company_id := v_company_id;

  return new;
end;
$$;


drop trigger if exists jobs_sync_company_identity
on public.jobs;


create trigger jobs_sync_company_identity
before insert or update of company_id, company_user_id
on public.jobs
for each row
execute function public.sync_job_company_identity();


-- ============================================================
-- 3. JOB INSERT
--
-- Canonical active/approved company required.
-- jobs.manage company permission is required unless the user
-- has global jobs administration.
-- ============================================================

drop policy if exists jobs_company_insert
on public.jobs;


create policy jobs_company_insert
on public.jobs
for insert
to authenticated
with check (
  (
    public.company_has_permission(
      company_id,
      'jobs.manage'
    )
    and exists (
      select 1
      from public.companies c
      where c.id = jobs.company_id
        and c.record_status = 'active'
        and c.verification_status =
          'approved'::public.approval_status
    )
  )
  or public.can_manage_jobs()
  or public.is_admin()
);


-- ============================================================
-- 4. JOB UPDATE
--
-- Company members with jobs.manage may edit job content.
-- Existing approval/publish protection trigger remains active.
-- ============================================================

drop policy if exists jobs_company_or_admin_update
on public.jobs;


create policy jobs_company_or_admin_update
on public.jobs
for update
to authenticated
using (
  public.company_has_permission(
    company_id,
    'jobs.manage'
  )
  or public.can_manage_jobs()
  or public.is_admin()
)
with check (
  public.company_has_permission(
    company_id,
    'jobs.manage'
  )
  or public.can_manage_jobs()
  or public.is_admin()
);


-- ============================================================
-- 5. JOB DELETE
--
-- Company-side deletion remains limited to jobs that have not
-- been approved. Global administrators retain management.
-- ============================================================

drop policy if exists jobs_company_pending_delete
on public.jobs;


create policy jobs_company_pending_delete
on public.jobs
for delete
to authenticated
using (
  (
    public.company_has_permission(
      company_id,
      'jobs.manage'
    )
    and verification_status
        <> 'approved'::public.approval_status
  )
  or public.can_manage_jobs()
  or public.is_admin()
);


-- ============================================================
-- 6. JOB SELECT
--
-- Public:
-- approved + published jobs
--
-- Private workspace:
-- authorized company job managers
-- ============================================================

drop policy if exists jobs_public_owner_or_admin_select
on public.jobs;


create policy jobs_public_owner_or_admin_select
on public.jobs
for select
to anon, authenticated
using (
  (
    verification_status =
      'approved'::public.approval_status
    and is_published
  )
  or public.company_has_permission(
    company_id,
    'jobs.manage'
  )
  or public.can_manage_jobs()
  or public.is_admin()
);


-- ============================================================
-- 7. JOB REQUIREMENTS
--
-- Move requirement management from legacy owner identity to
-- canonical company workspace permission.
-- ============================================================

drop policy if exists job_requirements_owner_or_admin
on public.job_requirements;


create policy job_requirements_owner_or_admin
on public.job_requirements
for all
to authenticated
using (
  exists (
    select 1
    from public.jobs j
    where j.id = job_requirements.job_id
      and (
        public.company_has_permission(
          j.company_id,
          'jobs.manage'
        )
        or public.can_manage_jobs()
        or public.is_admin()
      )
  )
)
with check (
  exists (
    select 1
    from public.jobs j
    where j.id = job_requirements.job_id
      and (
        public.company_has_permission(
          j.company_id,
          'jobs.manage'
        )
        or public.can_manage_jobs()
        or public.is_admin()
      )
  )
);


-- ============================================================
-- 8. APPLICATION VISIBILITY
--
-- Candidate sees own application.
-- Authorized company applicant managers see applications
-- against their company's jobs.
--
-- UPDATE workflow is intentionally NOT changed here.
-- Candidate/employer status transition hardening will be a
-- separate migration.
-- ============================================================

drop policy if exists applications_candidate_or_employer
on public.job_applications;


create policy applications_candidate_or_employer
on public.job_applications
for select
to authenticated
using (
  candidate_user_id = auth.uid()
  or exists (
    select 1
    from public.jobs j
    where j.id = job_applications.job_id
      and public.company_has_permission(
        j.company_id,
        'applicants.manage'
      )
  )
  or public.can_manage_jobs()
  or public.is_admin()
);


-- ============================================================
-- 9. JOB MATCH VISIBILITY
-- ============================================================

drop policy if exists job_matches_parties
on public.job_matches;


create policy job_matches_parties
on public.job_matches
for select
to authenticated
using (
  candidate_user_id = auth.uid()
  or exists (
    select 1
    from public.jobs j
    where j.id = job_matches.job_id
      and public.company_has_permission(
        j.company_id,
        'applicants.manage'
      )
  )
  or public.can_manage_jobs()
  or public.is_admin()
);


commit;
