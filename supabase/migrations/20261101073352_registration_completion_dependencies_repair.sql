begin;


create table if not exists public.registration_evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_type text not null check (document_type in (
    'cnic_front','cnic_back','degree_certificate','pvmc_registration',
    'student_enrollment','qualification_certificate','business_registration',
    'clinic_registration','laboratory_registration'
  )),
  cnic_number text not null check (cnic_number ~ '^[0-9]{13}$'),
  storage_path text not null unique,
  original_filename text not null,
  content_type text not null check (content_type in ('application/pdf','image/jpeg','image/png','image/webp')),
  file_size integer not null check (file_size > 0 and file_size <= 8388608),
  verification_status text not null default 'pending' check (verification_status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

alter table public.registration_evidence enable row level security;

drop policy if exists registration_evidence_owner_read on public.registration_evidence;
create policy registration_evidence_owner_read on public.registration_evidence
  for select to authenticated using (user_id = auth.uid());

drop policy if exists registration_evidence_owner_insert on public.registration_evidence;
create policy registration_evidence_owner_insert on public.registration_evidence
  for insert to authenticated with check (user_id = auth.uid() and verification_status = 'pending');

create or replace function public.validate_registration_evidence_object()
returns trigger
language plpgsql
security definer
set search_path = public, storage
as $$
begin
  if not exists (
    select 1 from storage.objects
    where bucket_id = 'registration-evidence'
      and name = new.storage_path
      and (storage.foldername(name))[1] = new.user_id::text
  ) then
    raise exception 'Registration evidence must reference an uploaded private object owned by the account';
  end if;
  return new;
end;
$$;

drop trigger if exists registration_evidence_object_check on public.registration_evidence;
create trigger registration_evidence_object_check
  before insert on public.registration_evidence
  for each row execute function public.validate_registration_evidence_object();

create index if not exists registration_evidence_user_type_idx
  on public.registration_evidence(user_id, document_type, created_at desc);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('registration-evidence','registration-evidence',false,8388608,array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = 8388608, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists registration_evidence_storage_owner_select on storage.objects;
create policy registration_evidence_storage_owner_select on storage.objects
  for select to authenticated using (
    bucket_id = 'registration-evidence' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists registration_evidence_storage_owner_insert on storage.objects;
create policy registration_evidence_storage_owner_insert on storage.objects
  for insert to authenticated with check (
    bucket_id = 'registration-evidence' and (storage.foldername(name))[1] = auth.uid()::text
  );

create table if not exists public.registration_completion_gate (
  user_id uuid primary key references auth.users(id) on delete cascade,
  registration_intent text not null default '' check (registration_intent in ('','clinic')),
  student_track text not null default '' check (student_track in ('','dvm_student','postgraduate_student','phd_student','job_seeker')),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  review_status text not null default 'pending' check (review_status in ('pending','approved','rejected'))
);

alter table public.registration_completion_gate enable row level security;

drop policy if exists registration_completion_gate_owner_read on public.registration_completion_gate;
create policy registration_completion_gate_owner_read on public.registration_completion_gate
  for select to authenticated using (user_id = auth.uid());

drop policy if exists registration_evidence_owner_delete on public.registration_evidence;
create policy registration_evidence_owner_delete on public.registration_evidence
  for delete to authenticated using (
    user_id = auth.uid() and verification_status = 'pending'
    and exists (select 1 from public.registration_completion_gate g where g.user_id = auth.uid() and g.completed_at is null)
  );

drop policy if exists registration_evidence_storage_owner_delete on storage.objects;
create policy registration_evidence_storage_owner_delete on storage.objects
  for delete to authenticated using (
    bucket_id = 'registration-evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (select 1 from public.registration_completion_gate g where g.user_id = auth.uid() and g.completed_at is null)
  );

create or replace function public.mark_registration_completion_pending()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.registration_completion_gate (user_id, registration_intent, student_track)
  values (
    new.id,
    case when new.raw_user_meta_data ->> 'registration_intent' = 'clinic' then 'clinic' else '' end,
    case when new.raw_user_meta_data ->> 'student_track' in ('dvm_student','postgraduate_student','phd_student','job_seeker')
      then new.raw_user_meta_data ->> 'student_track' else '' end
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists vetconnect_registration_completion_gate on auth.users;
create trigger vetconnect_registration_completion_gate
  after insert on auth.users
  for each row execute function public.mark_registration_completion_pending();

insert into public.registration_completion_gate (user_id, registration_intent, student_track)
select id,
  case when raw_user_meta_data ->> 'registration_intent' = 'clinic' then 'clinic' else '' end,
  case when raw_user_meta_data ->> 'student_track' in ('dvm_student','postgraduate_student','phd_student','job_seeker')
    then raw_user_meta_data ->> 'student_track' else '' end
from auth.users
where raw_user_meta_data ->> 'registration_details_pending' = 'true'
on conflict (user_id) do nothing;

grant select, insert, delete on public.registration_evidence to authenticated;
grant select on public.registration_completion_gate to authenticated;
revoke all on function public.validate_registration_evidence_object() from public;
revoke all on function public.mark_registration_completion_pending() from public;

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
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select primary_role into account_role_value
  from public.profiles
  where id = current_user_id;

  select registration_intent, student_track
    into gate_intent, gate_student_track
  from public.registration_completion_gate
  where user_id = current_user_id and completed_at is null
  for update;

  if not found then
    return;
  end if;

  if not exists (
    select 1 from public.registration_evidence
    where user_id = current_user_id and document_type = 'cnic_front'
  ) or not exists (
    select 1 from public.registration_evidence
    where user_id = current_user_id and document_type = 'cnic_back'
  ) then
    raise exception 'CNIC front and back are required';
  end if;

  if account_role_value = 'veterinarian' then
    if not exists (select 1 from public.registration_evidence where user_id=current_user_id and document_type='degree_certificate')
      or not exists (select 1 from public.registration_evidence where user_id=current_user_id and document_type='pvmc_registration') then
      raise exception 'Veterinary degree and PVMC evidence are required';
    end if;
  elsif account_role_value = 'candidate' then
    if gate_student_track = 'job_seeker' then
      if not exists (select 1 from public.registration_evidence where user_id=current_user_id and document_type='qualification_certificate') then
        raise exception 'Qualification evidence is required';
      end if;
    else
      if not exists (select 1 from public.registration_evidence where user_id=current_user_id and document_type='student_enrollment') then
        raise exception 'Student enrollment evidence is required';
      end if;
    end if;
  elsif account_role_value = 'professional' then
    if not exists (select 1 from public.registration_evidence where user_id=current_user_id and document_type='qualification_certificate') then
      raise exception 'Professional qualification evidence is required';
    end if;
  elsif account_role_value = 'company' then
    if gate_intent = 'clinic' then
      if not exists (select 1 from public.registration_evidence where user_id=current_user_id and document_type='clinic_registration')
        or not exists (select 1 from public.registration_evidence where user_id=current_user_id and document_type='pvmc_registration') then
        raise exception 'Clinic registration and responsible veterinarian PVMC evidence are required';
      end if;
    elsif not exists (select 1 from public.registration_evidence where user_id=current_user_id and document_type='business_registration') then
      raise exception 'Company registration evidence is required';
    end if;
  elsif account_role_value = 'laboratory' then
    if not exists (select 1 from public.registration_evidence where user_id=current_user_id and document_type='laboratory_registration') then
      raise exception 'Laboratory registration evidence is required';
    end if;
  end if;

  update public.registration_completion_gate
  set completed_at = now()
  where user_id = current_user_id and completed_at is null;
end;
$$;

revoke all on function public.complete_registration_submission() from public;
grant execute on function public.complete_registration_submission() to authenticated;



-- Keep clinic verification details private on the owner/admin-protected
-- clinics table. The public_clinics view remains unchanged.
alter table public.clinics
  add column if not exists registration_number text,
  add column if not exists responsible_veterinarian_name text,
  add column if not exists responsible_veterinarian_pvmc text,
  add column if not exists logo_url text,
  add column if not exists other_cities text[] not null default '{}';

comment on column public.clinics.registration_number is
  'Private clinic/business registration or NTN reference; excluded from the public clinic view.';
comment on column public.clinics.responsible_veterinarian_name is
  'Private responsible practitioner contact for administrator review.';
comment on column public.clinics.responsible_veterinarian_pvmc is
  'Private PVMC reference for administrator review; never exposed in public directory.';
comment on column public.clinics.logo_url is
  'Approved public clinic logo URL.';
comment on column public.clinics.other_cities is
  'Additional service cities managed by the same clinic organization.';

-- Preserve the submitted category form as private, reviewable data.
-- Users can edit this draft only before submission or after a rejection.
create table if not exists public.registration_profile_details (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  category_details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.registration_profile_details enable row level security;

drop policy if exists registration_details_owner_or_reviewer_select
  on public.registration_profile_details;
create policy registration_details_owner_or_reviewer_select
  on public.registration_profile_details
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.has_admin_permission('profiles.review')
  );

drop policy if exists registration_details_owner_draft_insert
  on public.registration_profile_details;
create policy registration_details_owner_draft_insert
  on public.registration_profile_details
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.registration_completion_gate g
      where g.user_id = (select auth.uid())
        and (g.completed_at is null or g.review_status = 'rejected')
    )
  );

drop policy if exists registration_details_owner_draft_update
  on public.registration_profile_details;
create policy registration_details_owner_draft_update
  on public.registration_profile_details
  for update to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.registration_completion_gate g
      where g.user_id = (select auth.uid())
        and (g.completed_at is null or g.review_status = 'rejected')
    )
  )
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.registration_completion_gate g
      where g.user_id = (select auth.uid())
        and (g.completed_at is null or g.review_status = 'rejected')
    )
  );

grant select, insert, update
  on public.registration_profile_details to authenticated;
revoke delete on public.registration_profile_details from authenticated;

drop trigger if exists registration_profile_details_set_updated_at
  on public.registration_profile_details;
create trigger registration_profile_details_set_updated_at
  before update on public.registration_profile_details
  for each row execute function public.set_updated_at();

comment on table public.registration_profile_details is
  'Private category-specific registration data retained for reviewers and draft resumption.';



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
        and (g.completed_at is null or g.review_status = 'rejected')
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
  using (user_id = auth.uid() and (completed_at is null or review_status = 'rejected'))
  with check (user_id = auth.uid() and (completed_at is null or review_status = 'rejected'));

revoke update on public.registration_completion_gate from authenticated;
grant update (cnic_number) on public.registration_completion_gate to authenticated;

drop policy if exists registration_evidence_storage_owner_insert on storage.objects;
create policy registration_evidence_storage_owner_insert on storage.objects
  for insert to authenticated with check (
    bucket_id = 'registration-evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1 from public.registration_completion_gate g
      where g.user_id = auth.uid()
        and (g.completed_at is null or g.review_status = 'rejected')
    )
  );

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
      where g.user_id = auth.uid()
        and (g.completed_at is null or g.review_status = 'rejected')
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
  if gate_row.completed_at is not null and gate_row.review_status = 'pending' then
    raise exception 'This registration is already awaiting administrator review';
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
  set verification_status = 'pending',
      cnic_number = gate_row.cnic_number
  where e.id in (
    select latest.id from (
      select distinct on (document_type) id, document_type, created_at, verification_status
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
      update public.clinics set
        verification_status = p_decision::public.approval_status,
        rejection_reason = case when p_decision='rejected' then p_reason else null end,
        is_published = p_decision='approved',
        logo_url = case when p_decision='approved' then p_public_image_url else logo_url end,
        verified_at = case when p_decision='approved' then now() else null end,
        verified_by = case when p_decision='approved' then p_reviewer_id else null end
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
$$;

revoke all on function public.review_registration_submission(uuid,text,text,uuid,text) from public;
grant execute on function public.review_registration_submission(uuid,text,text,uuid,text) to authenticated;



commit;
