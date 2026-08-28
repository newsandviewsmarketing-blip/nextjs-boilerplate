begin;

-- ============================================================
-- VetConnect
-- CLINIC / FACILITY REVIEW HARDENING
--
-- Replaces the incorrect product-specific approval trigger
-- currently attached to public.clinics.
--
-- Ordinary clinic owners:
--   - must submit as pending + unpublished
--   - cannot directly approve/publish
--   - substantive edits return the clinic to review
--
-- Verification administrators retain review authority.
-- ============================================================


-- ============================================================
-- 1. DEDICATED CLINIC REVIEW FUNCTION
-- ============================================================

create or replace function public.protect_clinic_review_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin

  -- Trusted database/service operations.
  if current_user in (
    'postgres',
    'service_role',
    'supabase_admin'
  ) then
    return new;
  end if;


  -- ==========================================================
  -- INSERT
  -- Ordinary users cannot create an approved/published clinic.
  -- ==========================================================

  if tg_op = 'INSERT' then

    if not public.can_verify()
       and not public.is_admin()
    then

      if new.verification_status
           <> 'pending'::public.approval_status
         or new.is_published = true
         or new.verified_at is not null
         or new.verified_by is not null
         or new.rejection_reason is not null
      then
        raise exception
          'New clinics must begin pending review and unpublished';
      end if;

      new.verification_status :=
        'pending'::public.approval_status;

      new.rejection_reason := null;
      new.is_published := false;
      new.verified_at := null;
      new.verified_by := null;

    end if;

    return new;

  end if;


  -- ==========================================================
  -- UPDATE
  -- Only verification/admin authority may directly change
  -- review and publication fields.
  -- ==========================================================

  if not public.can_verify()
     and not public.is_admin()
     and (
       new.verification_status
         is distinct from old.verification_status
       or new.rejection_reason
         is distinct from old.rejection_reason
       or new.is_published
         is distinct from old.is_published
       or new.verified_at
         is distinct from old.verified_at
       or new.verified_by
         is distinct from old.verified_by
     )
  then
    raise exception
      'Only an authorized verification administrator can review or publish a clinic';
  end if;


  -- ==========================================================
  -- SUBSTANTIVE OWNER EDIT
  --
  -- If an ordinary owner changes clinic information after it
  -- has been reviewed, return the record to moderation.
  -- ==========================================================

  if not public.can_verify()
     and not public.is_admin()
     and (
       to_jsonb(new)
         - array[
             'updated_at',
             'verification_status',
             'rejection_reason',
             'is_published',
             'verified_at',
             'verified_by'
           ]
     ) is distinct from (
       to_jsonb(old)
         - array[
             'updated_at',
             'verification_status',
             'rejection_reason',
             'is_published',
             'verified_at',
             'verified_by'
           ]
     )
  then

    new.verification_status :=
      'pending'::public.approval_status;

    new.rejection_reason := null;
    new.is_published := false;
    new.verified_at := null;
    new.verified_by := null;

  end if;


  return new;

end;
$$;


-- ============================================================
-- 2. REPLACE INCORRECT PRODUCT TRIGGER
-- ============================================================

drop trigger if exists clinics_protect_verification
on public.clinics;


create trigger clinics_protect_verification
before insert or update
on public.clinics
for each row
execute function public.protect_clinic_review_fields();


commit;
