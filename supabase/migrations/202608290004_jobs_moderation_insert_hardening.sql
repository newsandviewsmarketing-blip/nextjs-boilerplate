begin;

-- ============================================================
-- VetConnect Jobs
-- Moderation / Publication Insert Hardening
--
-- Company-side job submissions must always begin:
--   verification_status = pending
--   is_published        = false
--
-- Existing update moderation protection is retained.
-- ============================================================


-- ============================================================
-- 1. HARDEN JOB REVIEW / PUBLISH TRIGGER
-- ============================================================

create or replace function public.protect_job_approval_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin

  -- ----------------------------------------------------------
  -- INSERT
  --
  -- Ordinary company/recruitment users cannot create a job
  -- directly in approved or published state.
  -- ----------------------------------------------------------

  if tg_op = 'INSERT' then

    if current_user not in (
      'postgres',
      'service_role',
      'supabase_admin'
    )
    and not public.can_manage_content()
    and not public.can_verify()
    and not public.is_admin()
    then

      if new.verification_status
           <> 'pending'::public.approval_status
         or new.is_published
      then
        raise exception
          'New jobs must begin pending review and unpublished';
      end if;

      new.verification_status :=
        'pending'::public.approval_status;

      new.is_published := false;

    end if;

    return new;

  end if;


  -- ----------------------------------------------------------
  -- UPDATE
  --
  -- Preserve existing moderation boundary.
  -- ----------------------------------------------------------

  if current_user not in (
    'postgres',
    'service_role',
    'supabase_admin'
  )
  and not public.can_manage_content()
  and not public.can_verify()
  and not public.is_admin()
  and (
    new.verification_status
      is distinct from old.verification_status
    or
    new.is_published
      is distinct from old.is_published
  )
  then
    raise exception
      'Only an authorized content administrator can review or publish a job';
  end if;


  -- ----------------------------------------------------------
  -- If an ordinary company user edits substantive job content
  -- after approval, automatically return the job to moderation.
  -- ----------------------------------------------------------

  if current_user not in (
    'postgres',
    'service_role',
    'supabase_admin'
  )
  and not public.can_manage_content()
  and not public.can_verify()
  and not public.is_admin()
  and (
    to_jsonb(new)
      - array[
          'updated_at',
          'verification_status',
          'is_published'
        ]
  ) is distinct from (
    to_jsonb(old)
      - array[
          'updated_at',
          'verification_status',
          'is_published'
        ]
  )
  then

    new.verification_status :=
      'pending'::public.approval_status;

    new.is_published := false;

  end if;


  return new;

end;
$$;


-- Existing trigger was UPDATE-only.
-- Recreate it for INSERT + UPDATE.

drop trigger if exists jobs_protect_approval
on public.jobs;


create trigger jobs_protect_approval
before insert or update
on public.jobs
for each row
execute function public.protect_job_approval_fields();


-- ============================================================
-- 2. DEFENCE-IN-DEPTH ON COMPANY JOB INSERT POLICY
--
-- Company members may only submit pending/unpublished jobs.
-- Global job administrators retain management authority.
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

    and verification_status =
      'pending'::public.approval_status

    and is_published = false
  )

  or public.can_manage_jobs()

  or public.is_admin()
);


commit;
