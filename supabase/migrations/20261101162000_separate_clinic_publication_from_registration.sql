-- VetConnect: separate company registration from veterinary practice publication.
-- Staged migration; must be reviewed and tested before applying to production.
-- Existing published clinics are left untouched. The gate applies to NEW
-- publications or returning an unpublished clinic to published.
begin;

alter table public.clinics
  add column if not exists pvmc_review_note text,
  add column if not exists pvmc_reviewed_by uuid,
  add column if not exists pvmc_reviewed_at timestamptz;

create or replace function public.enforce_clinic_publication_readiness()
returns trigger
language plpgsql
set search_path to 'public'
as $clinic_publication$
declare
  needs_review boolean := false;
begin
  if tg_op = 'UPDATE' then
    if not public.can_verify() and not public.is_admin() and
      (new.pvmc_review_note is distinct from old.pvmc_review_note
       or new.pvmc_reviewed_by is distinct from old.pvmc_reviewed_by
       or new.pvmc_reviewed_at is distinct from old.pvmc_reviewed_at)
    then
      raise exception 'Only an authorized reviewer may change clinical PVMC review fields';
    end if;

    -- Any return to draft/unpublished also revokes stale review proof.
    if old.is_published = true and new.is_published = false then
      new.pvmc_review_note := null;
      new.pvmc_reviewed_by := null;
      new.pvmc_reviewed_at := null;
    end if;
    needs_review := new.is_published and old.is_published is distinct from true;
  else
    -- Ordinary clinic creators cannot fabricate a completed PVMC check
    -- while the facility is a private draft.
    if not public.can_verify() and not public.is_admin()
       and (new.pvmc_review_note is not null
          or new.pvmc_reviewed_by is not null
          or new.pvmc_reviewed_at is not null) then
      raise exception 'Only an authorized reviewer may attest PVMC verification';
    end if;
    needs_review := new.is_published;
  end if;

  if needs_review then
    if new.verification_status <> 'approved'::public.approval_status then
      raise exception 'Clinic cannot be published without approved facility review';
    end if;
    if nullif(btrim(coalesce(new.clinic_name,'')),'') is null
      or nullif(btrim(coalesce(new.responsible_veterinarian_name,'')),'') is null
      or length(btrim(coalesce(new.responsible_veterinarian_pvmc,''))) < 3
      or nullif(btrim(coalesce(new.province,'')),'') is null
      or nullif(btrim(coalesce(new.city,'')),'') is null
    then
      raise exception 'Clinic name, responsible practitioner, PVMC number, province and city are required for publication';
    end if;
    if new.pvmc_reviewed_at is null or new.pvmc_reviewed_by is null
       or length(btrim(coalesce(new.pvmc_review_note,''))) < 25
       or new.verified_by is distinct from new.pvmc_reviewed_by
    then
      raise exception 'Clinic publication requires a recorded reviewer PVMC cross-check';
    end if;
    if not exists (
      select 1 from public.clinic_availability a
      where a.clinic_id = new.id and a.is_open = true
    ) then
      raise exception 'Clinic needs an open day in weekly availability before publication';
    end if;
    if not exists (
      select 1 from public.clinic_services s
      where s.clinic_id = new.id and s.is_active = true and s.is_public = true
    ) then
      raise exception 'Clinic needs an active public service before publication';
    end if;
  end if;
  return new;
end;
$clinic_publication$;

drop trigger if exists clinics_publication_readiness on public.clinics;
create trigger clinics_publication_readiness
before insert or update on public.clinics
for each row
execute function public.enforce_clinic_publication_readiness();

-- The existing registration RPC is retained with a *single* material change:
-- a company account's registration approval leaves its clinic pending and private.
CREATE OR REPLACE FUNCTION public.review_registration_submission(p_user_id uuid, p_decision text, p_reason text, p_reviewer_id uuid, p_public_image_url text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare
  account_role_value text;
  category_details jsonb := '{}'::jsonb;
  canonical_company_id uuid;
  gate_row public.registration_completion_gate%rowtype;
  required_types text[];
  missing_type text;
begin
  if auth.uid() is null or auth.uid() <> p_reviewer_id
     or not public.has_admin_permission('profiles.review') then
    raise exception 'Profile review permission is required';
  end if;
  if p_decision not in ('approved','rejected') then
    raise exception 'Invalid registration review decision';
  end if;
  if p_decision = 'rejected' and coalesce(trim(p_reason),'') = '' then
    raise exception 'A review note is required when returning a registration';
  end if;

  select * into gate_row
  from public.registration_completion_gate
  where user_id = p_user_id
  for update;
  if not found or gate_row.completed_at is null then
    raise exception 'Registration has not been submitted for review';
  end if;
  if gate_row.review_status = 'approved' then
    raise exception 'This registration has already been approved';
  end if;

  select primary_role into account_role_value
  from public.profiles where id = p_user_id;
  if account_role_value is null then
    raise exception 'Registration profile is missing';
  end if;

  select details.category_details into category_details
  from public.registration_profile_details as details
  where details.user_id = p_user_id;
  category_details := coalesce(category_details, '{}'::jsonb);

  required_types := array['cnic_front','cnic_back'];
  if account_role_value in ('veterinarian','candidate','professional','user') then
    required_types := array_append(required_types,'profile_photo');
  elsif account_role_value in ('company','laboratory') then
    required_types := array_append(required_types,'company_logo');
  end if;

  if account_role_value = 'veterinarian' then
    required_types := required_types || array['degree_certificate','pvmc_registration'];
  elsif account_role_value = 'candidate' then
    if gate_row.student_track = 'job_seeker' then required_types := required_types || array['qualification_certificate'];
    else required_types := required_types || array['student_enrollment']; end if;
  elsif account_role_value = 'professional' then
    required_types := required_types || array['qualification_certificate'];
  elsif account_role_value = 'company' then
    if gate_row.registration_intent = 'clinic' then required_types := required_types || array['clinic_registration','pvmc_registration'];
    else required_types := required_types || array['business_registration']; end if;
  elsif account_role_value = 'laboratory' then
    required_types := required_types || array['laboratory_registration'];
  end if;

  if p_decision = 'approved' then
    foreach missing_type in array required_types loop
      if not exists (
        select 1
        from (
          select distinct on (e.document_type) e.document_type, e.verification_status
          from public.registration_evidence e
          where e.user_id = p_user_id
          order by e.document_type, e.created_at desc
        ) latest
        where latest.document_type = missing_type
          and latest.verification_status = 'pending'
      ) then
        raise exception 'Required pending evidence is missing: %', missing_type;
      end if;
    end loop;
  end if;

  update public.registration_evidence e
  set verification_status = p_decision,
      reviewed_at = now(),
      reviewed_by = p_reviewer_id
  where e.id in (
    select latest.id from (
      select distinct on (document_type) id, document_type, created_at, verification_status
      from public.registration_evidence
      where user_id = p_user_id
      order by document_type, created_at desc
    ) latest
    where latest.document_type = any(required_types)
      and latest.verification_status = 'pending'
  );

  if account_role_value = 'veterinarian' then
    update public.veterinarian_profiles set
      verification_status = p_decision::public.approval_status,
      rejection_reason = case when p_decision='rejected' then p_reason else null end,
      image_url = case when p_decision='approved' then p_public_image_url else image_url end,
      verified_at = case when p_decision='approved' then now() else null end,
      verified_by = case when p_decision='approved' then p_reviewer_id else null end
    where user_id = p_user_id;
  elsif account_role_value in ('professional','candidate') then
    update public.professional_profiles set
      verification_status = p_decision::public.approval_status,
      rejection_reason = case when p_decision='rejected' then p_reason else null end,
      profile_visibility = case when p_decision='approved' then 'public'::public.profile_visibility else 'owner_only'::public.profile_visibility end,
      image_url = case when p_decision='approved' then p_public_image_url else image_url end,
      verified_at = case when p_decision='approved' then now() else null end,
      verified_by = case when p_decision='approved' then p_reviewer_id else null end
    where user_id = p_user_id;
  elsif account_role_value = 'company' then
    if p_decision = 'approved' and (
      coalesce(category_details->>'organization_name','') = ''
      or coalesce(category_details->>'company_registration_number','') = ''
    ) then
      raise exception 'Required company registration details are missing from the private review record';
    end if;

    update public.company_profiles set
      company_name = coalesce(nullif(category_details->>'organization_name',''), company_name),
      business_type = case
        when gate_row.registration_intent='clinic' then 'Veterinary Clinic / Hospital'
        else coalesce(nullif(category_details->>'company_type',''), business_type)
      end,
      registration_number = coalesce(nullif(category_details->>'company_registration_number',''), registration_number),
      address = case
        when gate_row.registration_intent='clinic' then coalesce(nullif(category_details->>'facility_address',''), address)
        else address
      end,
      description = case
        when gate_row.registration_intent='clinic' then coalesce(nullif(category_details->>'facility_type',''), description)
        else 'Registered VetConnect employer / company onboarding'
      end,
      verification_status = p_decision::public.approval_status,
      rejection_reason = case when p_decision='rejected' then p_reason else null end,
      logo_url = case when p_decision='approved' then p_public_image_url else logo_url end,
      verified_at = case when p_decision='approved' then now() else null end,
      verified_by = case when p_decision='approved' then p_reviewer_id else null end
    where user_id = p_user_id;

    if p_decision = 'approved' then
      insert into public.companies (
        legacy_company_user_id, canonical_name, legal_name, trade_name, slug,
        country, verification_status, record_status, created_by, verified_at, verified_by
      )
      select
        p_user_id,
        coalesce(nullif(cp.company_name,''),'VetConnect Company'),
        nullif(cp.legal_name,''), nullif(cp.trade_name,''),
        coalesce(
          nullif(regexp_replace(lower(coalesce(cp.slug,cp.company_name)), '[^a-z0-9]+', '-', 'g'), ''),
          'company'
        ) || '-' || left(p_user_id::text,8),
        coalesce(nullif(cp.country,''),'Pakistan'),
        'approved'::public.approval_status, 'active', p_user_id, now(), p_reviewer_id
      from public.company_profiles cp
      where cp.user_id=p_user_id
      on conflict (legacy_company_user_id) do update set
        canonical_name=excluded.canonical_name,
        legal_name=excluded.legal_name,
        trade_name=excluded.trade_name,
        verification_status='approved'::public.approval_status,
        record_status='active',
        verified_at=now(),
        verified_by=p_reviewer_id
      returning id into canonical_company_id;

      if canonical_company_id is null then
        raise exception 'Canonical company profile could not be created';
      end if;

      delete from public.company_sectors where company_user_id=p_user_id;
      insert into public.company_sectors (company_user_id,sector)
      select p_user_id, sector_value
      from (
        select distinct btrim(value) as sector_value
        from jsonb_array_elements_text(
          case
            when jsonb_typeof(category_details->'industry_sectors')='array' then category_details->'industry_sectors'
            when coalesce(category_details->>'industry_sector','')<>'' then jsonb_build_array(category_details->>'industry_sector')
            else '[]'::jsonb
          end
        ) as sectors(value)
      ) selected_sectors
      where sector_value<>'';

      insert into public.company_members (
        company_id,user_id,member_role,designation,permissions,relationship_type,
        membership_status,verification_status,claim_source,is_current,is_public,
        is_primary,confirmed_by,confirmed_at
      ) values (
        canonical_company_id,p_user_id,'owner','Owner',
        array['company.manage','members.manage','jobs.manage','applicants.manage','products.manage','company.view_private'],
        'owner','active','approved'::public.approval_status,'owner_created',true,true,
        true,p_reviewer_id,now()
      )
      on conflict (company_id,user_id) do update set
        member_role='owner',
        permissions=excluded.permissions,
        relationship_type='owner',
        membership_status='active',
        verification_status='approved'::public.approval_status,
        claim_source='owner_created',
        is_current=true,
        is_public=true,
        is_primary=true,
        confirmed_by=p_reviewer_id,
        confirmed_at=now();
    end if;

    update public.companies c set
      logo_url = case when p_decision='approved' then p_public_image_url else c.logo_url end,
      verification_status = p_decision::public.approval_status,
      is_published = p_decision='approved',
      verified_at = case when p_decision='approved' then now() else null end,
      verified_by = case when p_decision='approved' then p_reviewer_id else null end
    from public.company_profiles cp
    where cp.user_id = p_user_id and c.legacy_company_user_id = p_user_id;

    if gate_row.registration_intent = 'clinic' then
      -- Approving an account does not publish a veterinary clinic.
      -- The facility keeps a separate pending clinical-practice review.
      update public.clinics set
        verification_status = case when p_decision='approved'
          then 'pending'::public.approval_status
          else 'rejected'::public.approval_status end,
        rejection_reason = case when p_decision='rejected' then p_reason else null end,
        is_published = false,
        logo_url = case when p_decision='approved' then p_public_image_url else logo_url end,
        verified_at = null,
        verified_by = null
      where owner_id = p_user_id;
      if not found then
        raise exception 'Clinic registration profile is missing';
      end if;
    end if;
  elsif account_role_value = 'laboratory' then
    update public.laboratories set
      verification_status = p_decision::public.approval_status,
      rejection_reason = case when p_decision='rejected' then p_reason else null end,
      is_published = p_decision='approved',
      logo_url = case when p_decision='approved' then p_public_image_url else logo_url end,
      verified_at = case when p_decision='approved' then now() else null end,
      verified_by = case when p_decision='approved' then p_reviewer_id else null end
    where owner_id = p_user_id;
  end if;

  update public.registration_completion_gate set
    review_status = p_decision,
    review_note = case when p_decision='rejected' then p_reason else null end,
    reviewed_at = now(),
    reviewed_by = p_reviewer_id
  where user_id = p_user_id;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    p_reviewer_id,
    'registration.' || p_decision,
    account_role_value,
    p_user_id,
    jsonb_build_object('reason', nullif(trim(p_reason),''), 'registration_submission', true)
  );
end;
$function$
;

revoke all on function public.review_registration_submission(uuid,text,text,uuid,text) from public;
grant execute on function public.review_registration_submission(uuid,text,text,uuid,text) to authenticated;
commit;
