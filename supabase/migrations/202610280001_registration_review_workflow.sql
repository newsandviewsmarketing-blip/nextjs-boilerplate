begin;

alter table public.registration_completion_gate
  add column if not exists cnic_number text,
  add column if not exists review_status text not null default 'pending',
  add column if not exists review_note text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists submitted_at timestamptz;

alter table public.registration_completion_gate
  drop constraint if exists registration_completion_gate_review_status_check;
alter table public.registration_completion_gate
  add constraint registration_completion_gate_review_status_check
  check (review_status in ('pending','approved','rejected'));

alter table public.registration_completion_gate
  drop constraint if exists registration_completion_gate_cnic_number_check;
alter table public.registration_completion_gate
  add constraint registration_completion_gate_cnic_number_check
  check (cnic_number is null or cnic_number ~ '^[0-9]{13}$');

alter table public.registration_evidence
  drop constraint if exists registration_evidence_document_type_check;
alter table public.registration_evidence
  add constraint registration_evidence_document_type_check
  check (document_type in (
    'cnic_front','cnic_back','profile_photo','company_logo',
    'degree_certificate','pvmc_registration','student_enrollment',
    'qualification_certificate','business_registration',
    'clinic_registration','laboratory_registration'
  ));

alter table public.registration_evidence
  drop constraint if exists registration_evidence_verification_status_check;
alter table public.registration_evidence
  add constraint registration_evidence_verification_status_check
  check (verification_status in ('draft','pending','approved','rejected','superseded'));

alter table public.registration_evidence
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null;

alter table public.laboratories add column if not exists logo_url text;
alter table public.laboratories add column if not exists registration_number text;

create index if not exists registration_completion_gate_review_idx
  on public.registration_completion_gate(review_status, submitted_at desc);
create index if not exists registration_evidence_latest_idx
  on public.registration_evidence(user_id, document_type, created_at desc);

drop policy if exists registration_evidence_owner_insert on public.registration_evidence;
create policy registration_evidence_owner_insert on public.registration_evidence
  for insert to authenticated with check (
    user_id = auth.uid()
    and verification_status = 'draft'
    and exists (
      select 1 from public.registration_completion_gate g
      where g.user_id = auth.uid()
        and g.review_status <> 'approved'
    )
  );

drop policy if exists registration_evidence_owner_delete on public.registration_evidence;
create policy registration_evidence_owner_delete on public.registration_evidence
  for delete to authenticated using (
    user_id = auth.uid()
    and verification_status in ('draft','rejected','superseded')
    and exists (
      select 1 from public.registration_completion_gate g
      where g.user_id = auth.uid() and g.review_status <> 'approved'
    )
  );

drop policy if exists registration_completion_gate_admin_read on public.registration_completion_gate;
create policy registration_completion_gate_admin_read on public.registration_completion_gate
  for select to authenticated using (public.has_admin_permission('profiles.review'));

drop policy if exists registration_evidence_admin_read on public.registration_evidence;
create policy registration_evidence_admin_read on public.registration_evidence
  for select to authenticated using (public.has_admin_permission('profiles.review'));

drop policy if exists registration_completion_gate_owner_update on public.registration_completion_gate;
create policy registration_completion_gate_owner_update on public.registration_completion_gate
  for update to authenticated
  using (user_id = auth.uid() and review_status <> 'approved')
  with check (user_id = auth.uid() and review_status <> 'approved');

revoke update on public.registration_completion_gate from authenticated;
grant update (cnic_number) on public.registration_completion_gate to authenticated;

drop policy if exists registration_evidence_storage_admin_read on storage.objects;
create policy registration_evidence_storage_admin_read on storage.objects
  for select to authenticated using (
    bucket_id = 'registration-evidence'
    and public.has_admin_permission('profiles.review')
  );

drop policy if exists registration_evidence_storage_owner_delete on storage.objects;
create policy registration_evidence_storage_owner_delete on storage.objects
  for delete to authenticated using (
    bucket_id = 'registration-evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1 from public.registration_completion_gate g
      where g.user_id = auth.uid() and g.review_status <> 'approved'
    )
  );

create or replace function public.complete_registration_submission()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id uuid := auth.uid();
  account_role_value text;
  gate_intent text;
  gate_student_track text;
  required_types text[];
  gate_row public.registration_completion_gate%rowtype;
  missing_type text;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select * into gate_row
  from public.registration_completion_gate
  where user_id = current_user_id
  for update;

  if not found then
    raise exception 'Registration review record is missing';
  end if;
  if gate_row.review_status = 'approved' then
    raise exception 'An approved registration cannot be changed';
  end if;
  if gate_row.cnic_number is null or gate_row.cnic_number !~ '^[0-9]{13}$' then
    raise exception 'A valid CNIC number is required';
  end if;

  select primary_role into account_role_value
  from public.profiles where id = current_user_id;
  if account_role_value is null then
    raise exception 'Registration profile is missing';
  end if;

  gate_intent := gate_row.registration_intent;
  gate_student_track := gate_row.student_track;

  required_types := array['cnic_front','cnic_back'];
  if account_role_value in ('veterinarian','candidate','professional','user') then
    required_types := array_append(required_types,'profile_photo');
  elsif account_role_value in ('company','laboratory') then
    required_types := array_append(required_types,'company_logo');
  end if;

  if account_role_value = 'veterinarian' then
    required_types := required_types || array['degree_certificate','pvmc_registration'];
  elsif account_role_value = 'candidate' then
    if gate_student_track = 'job_seeker' then
      required_types := required_types || array['qualification_certificate'];
    else
      required_types := required_types || array['student_enrollment'];
    end if;
  elsif account_role_value = 'professional' then
    required_types := required_types || array['qualification_certificate'];
  elsif account_role_value = 'company' then
    if gate_intent = 'clinic' then
      required_types := required_types || array['clinic_registration','pvmc_registration'];
    else
      required_types := required_types || array['business_registration'];
    end if;
  elsif account_role_value = 'laboratory' then
    required_types := required_types || array['laboratory_registration'];
  end if;

  foreach missing_type in array required_types loop
    if not exists (
      select 1
      from (
        select distinct on (e.document_type) e.document_type, e.verification_status
        from public.registration_evidence e
        where e.user_id = current_user_id
        order by e.document_type, e.created_at desc
      ) latest
      where latest.document_type = missing_type
        and latest.verification_status in ('draft','rejected')
    ) then
      raise exception 'Required document is missing: %', missing_type;
    end if;
  end loop;

  update public.registration_evidence e
  set verification_status = 'pending'
  where e.id in (
    select latest.id from (
      select distinct on (document_type) id, document_type, created_at
      from public.registration_evidence
      where user_id = current_user_id
      order by document_type, created_at desc
    ) latest
    where latest.document_type = any(required_types)
  );

  update public.registration_completion_gate
  set completed_at = now(),
      submitted_at = now(),
      review_status = 'pending',
      review_note = null,
      reviewed_at = null,
      reviewed_by = null
  where user_id = current_user_id;
end;
$$;

revoke all on function public.complete_registration_submission() from public;
grant execute on function public.complete_registration_submission() to authenticated;

create or replace function public.review_registration_submission(
  p_user_id uuid,
  p_decision text,
  p_reason text,
  p_reviewer_id uuid,
  p_public_image_url text
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  account_role_value text;
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
      select distinct on (document_type) id, document_type, created_at
      from public.registration_evidence
      where user_id = p_user_id
      order by document_type, created_at desc
    ) latest
    where latest.document_type = any(required_types)
      and latest.verification_status = 'pending'
  );

  if account_role_value = 'veterinarian' then
    update public.veterinarian_profiles set
      verification_status = p_decision,
      rejection_reason = case when p_decision='rejected' then p_reason else null end,
      image_url = case when p_decision='approved' then p_public_image_url else image_url end,
      verified_at = case when p_decision='approved' then now() else null end,
      verified_by = case when p_decision='approved' then p_reviewer_id else null end
    where user_id = p_user_id;
  elsif account_role_value in ('professional','candidate') then
    update public.professional_profiles set
      verification_status = p_decision,
      rejection_reason = case when p_decision='rejected' then p_reason else null end,
      profile_visibility = case when p_decision='approved' then 'public'::public.profile_visibility else 'owner_only'::public.profile_visibility end,
      image_url = case when p_decision='approved' then p_public_image_url else image_url end,
      verified_at = case when p_decision='approved' then now() else null end,
      verified_by = case when p_decision='approved' then p_reviewer_id else null end
    where user_id = p_user_id;
  elsif account_role_value = 'company' then
    update public.company_profiles set
      verification_status = p_decision,
      rejection_reason = case when p_decision='rejected' then p_reason else null end,
      logo_url = case when p_decision='approved' then p_public_image_url else logo_url end,
      verified_at = case when p_decision='approved' then now() else null end,
      verified_by = case when p_decision='approved' then p_reviewer_id else null end
    where user_id = p_user_id;

    update public.companies c set
      logo_url = case when p_decision='approved' then p_public_image_url else c.logo_url end,
      verification_status = p_decision,
      is_published = p_decision='approved',
      verified_at = case when p_decision='approved' then now() else null end,
      verified_by = case when p_decision='approved' then p_reviewer_id else null end
    from public.company_profiles cp
    where cp.user_id = p_user_id and c.legacy_company_user_id = p_user_id;
  elsif account_role_value = 'laboratory' then
    update public.laboratories set
      verification_status = p_decision,
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
$$;

revoke all on function public.review_registration_submission(uuid,text,text,uuid,text) from public;
grant execute on function public.review_registration_submission(uuid,text,text,uuid,text) to authenticated;

commit;
