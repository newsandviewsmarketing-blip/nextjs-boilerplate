begin;

-- ============================================================
-- VetConnect
-- Job Application Workflow Hardening
--
-- Separates candidate actions from employer recruitment actions.
-- ============================================================


-- ============================================================
-- 1. AUTHORIZED APPLICANT MANAGER CHECK
-- ============================================================

create or replace function public.can_manage_job_applicants(
  p_job_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin()
    or public.can_manage_jobs()
    or exists (
      select 1
      from public.jobs j
      where j.id = p_job_id
        and public.company_has_permission(
          j.company_id,
          'applicants.manage'
        )
    );
$$;


revoke all
on function public.can_manage_job_applicants(uuid)
from public;


grant execute
on function public.can_manage_job_applicants(uuid)
to authenticated;


-- ============================================================
-- 2. APPLICATION WORKFLOW PROTECTION
-- ============================================================

create or replace function public.protect_job_application_workflow()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_is_candidate boolean;
  v_is_employer boolean;
begin

  -- Direct database / trusted service operations.
  if current_user in (
    'postgres',
    'service_role',
    'supabase_admin'
  ) then
    return new;
  end if;


  -- ----------------------------------------------------------
  -- INSERT
  -- Candidate applications always begin as APPLIED.
  -- ----------------------------------------------------------

  if tg_op = 'INSERT' then

    if auth.uid() is null then
      raise exception 'Authentication required';
    end if;

    if new.candidate_user_id <> auth.uid() then
      raise exception
        'Candidates may only create their own applications';
    end if;

    if public.can_manage_job_applicants(new.job_id) then
      raise exception
        'You cannot apply to a job whose applicants you manage';
    end if;

    new.status := 'applied';
    new.applied_at := now();

    return new;

  end if;


  -- ----------------------------------------------------------
  -- UPDATE
  -- Immutable application identity fields.
  -- ----------------------------------------------------------

  if new.job_id is distinct from old.job_id
     or new.candidate_user_id
          is distinct from old.candidate_user_id
     or new.applied_at is distinct from old.applied_at
  then
    raise exception
      'Application identity fields cannot be changed';
  end if;


  -- Global recruitment/admin authority.
  if public.is_admin()
     or public.can_manage_jobs()
  then
    return new;
  end if;


  v_is_candidate :=
    auth.uid() is not null
    and old.candidate_user_id = auth.uid();

  v_is_employer :=
    public.can_manage_job_applicants(old.job_id);


  if not v_is_candidate
     and not v_is_employer
  then
    raise exception
      'Not authorized to update this application';
  end if;


  -- ----------------------------------------------------------
  -- CANDIDATE ACTIONS
  -- ----------------------------------------------------------

  if v_is_candidate
     and not v_is_employer
  then

    -- Cover note may only be edited while still newly applied.
    if new.cover_note is distinct from old.cover_note
       and not (
         old.status = 'applied'
         and new.status = 'applied'
       )
    then
      raise exception
        'Cover note can only be edited while application is newly applied';
    end if;


    -- Candidate may only withdraw an active application.
    if new.status is distinct from old.status then

      if new.status <> 'withdrawn'
         or old.status not in (
           'applied',
           'viewed',
           'shortlisted',
           'interview',
           'hold'
         )
      then
        raise exception
          'Candidate may only withdraw an active application';
      end if;

    end if;

    return new;

  end if;


  -- ----------------------------------------------------------
  -- EMPLOYER / RECRUITER ACTIONS
  -- ----------------------------------------------------------

  if v_is_employer then

    if new.cover_note is distinct from old.cover_note then
      raise exception
        'Employer cannot modify candidate cover note';
    end if;


    if new.status is distinct from old.status then

      if old.status = 'applied'
         and new.status not in (
           'viewed',
           'shortlisted',
           'interview',
           'hold',
           'selected',
           'rejected'
         )
      then
        raise exception 'Invalid application status transition';


      elsif old.status = 'viewed'
         and new.status not in (
           'shortlisted',
           'interview',
           'hold',
           'selected',
           'rejected'
         )
      then
        raise exception 'Invalid application status transition';


      elsif old.status = 'shortlisted'
         and new.status not in (
           'interview',
           'hold',
           'selected',
           'rejected'
         )
      then
        raise exception 'Invalid application status transition';


      elsif old.status = 'interview'
         and new.status not in (
           'hold',
           'selected',
           'rejected'
         )
      then
        raise exception 'Invalid application status transition';


      elsif old.status = 'hold'
         and new.status not in (
           'shortlisted',
           'interview',
           'selected',
           'rejected'
         )
      then
        raise exception 'Invalid application status transition';


      elsif old.status in (
        'selected',
        'rejected',
        'withdrawn'
      )
      then
        raise exception
          'Terminal application status cannot be changed';

      end if;

    end if;

    return new;

  end if;


  raise exception
    'Not authorized to update this application';

end;
$$;


drop trigger if exists
  job_applications_protect_workflow
on public.job_applications;


create trigger job_applications_protect_workflow
before insert or update
on public.job_applications
for each row
execute function public.protect_job_application_workflow();


-- ============================================================
-- 3. REMOVE SHARED UPDATE POLICY
-- ============================================================

drop policy if exists
  applications_parties_update
on public.job_applications;


-- ============================================================
-- 4. CANDIDATE UPDATE POLICY
-- ============================================================

create policy applications_candidate_update
on public.job_applications
for update
to authenticated
using (
  candidate_user_id = auth.uid()
)
with check (
  candidate_user_id = auth.uid()
);


-- ============================================================
-- 5. EMPLOYER / RECRUITER UPDATE POLICY
-- ============================================================

create policy applications_company_update
on public.job_applications
for update
to authenticated
using (
  public.can_manage_job_applicants(job_id)
)
with check (
  public.can_manage_job_applicants(job_id)
);


commit;
