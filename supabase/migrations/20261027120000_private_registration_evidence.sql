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

drop policy if exists registration_evidence_owner_delete on public.registration_evidence;
create policy registration_evidence_owner_delete on public.registration_evidence
  for delete to authenticated using (user_id = auth.uid() and verification_status = 'pending');

create or replace function public.validate_registration_evidence_object()
returns trigger
language plpgsql
security definer
set search_path = public, storage
as $
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
$;

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

drop policy if exists registration_evidence_storage_owner_delete on storage.objects;
create policy registration_evidence_storage_owner_delete on storage.objects
  for delete to authenticated using (
    bucket_id = 'registration-evidence' and (storage.foldername(name))[1] = auth.uid()::text
  );

create table if not exists public.registration_completion_gate (
  user_id uuid primary key references auth.users(id) on delete cascade,
  registration_intent text not null default '' check (registration_intent in ('','clinic')),
  student_track text not null default '' check (student_track in ('','dvm_student','postgraduate_student','phd_student','job_seeker')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.registration_completion_gate enable row level security;

drop policy if exists registration_completion_gate_owner_read on public.registration_completion_gate;
create policy registration_completion_gate_owner_read on public.registration_completion_gate
  for select to authenticated using (user_id = auth.uid());

create or replace function public.mark_registration_completion_pending()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $
begin
  if new.raw_user_meta_data ->> 'registration_details_pending' = 'true' then
    insert into public.registration_completion_gate (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$;

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

create or replace function public.complete_registration_submission()
returns void
language plpgsql
security definer
set search_path = public, auth
as $
declare
  current_user_id uuid := auth.uid();
  current_role text;
  gate_intent text;
  gate_student_track text;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select primary_role into current_role
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

  if current_role = 'veterinarian' then
    if not exists (select 1 from public.registration_evidence where user_id=current_user_id and document_type='degree_certificate')
      or not exists (select 1 from public.registration_evidence where user_id=current_user_id and document_type='pvmc_registration') then
      raise exception 'Veterinary degree and PVMC evidence are required';
    end if;
  elsif current_role = 'candidate' then
    if gate_student_track = 'job_seeker' then
      if not exists (select 1 from public.registration_evidence where user_id=current_user_id and document_type='qualification_certificate') then
        raise exception 'Qualification evidence is required';
      end if;
    else
      if not exists (select 1 from public.registration_evidence where user_id=current_user_id and document_type='student_enrollment') then
        raise exception 'Student enrollment evidence is required';
      end if;
    end if;
  elsif current_role = 'professional' then
    if not exists (select 1 from public.registration_evidence where user_id=current_user_id and document_type='qualification_certificate') then
      raise exception 'Professional qualification evidence is required';
    end if;
  elsif current_role = 'company' then
    if gate_intent = 'clinic' then
      if not exists (select 1 from public.registration_evidence where user_id=current_user_id and document_type='clinic_registration')
        or not exists (select 1 from public.registration_evidence where user_id=current_user_id and document_type='pvmc_registration') then
        raise exception 'Clinic registration and responsible veterinarian PVMC evidence are required';
      end if;
    elsif not exists (select 1 from public.registration_evidence where user_id=current_user_id and document_type='business_registration') then
      raise exception 'Company registration evidence is required';
    end if;
  elsif current_role = 'laboratory' then
    if not exists (select 1 from public.registration_evidence where user_id=current_user_id and document_type='laboratory_registration') then
      raise exception 'Laboratory registration evidence is required';
    end if;
  elsif current_role <> 'user' then
    raise exception 'Unsupported registration category';
  end if;

  update public.registration_completion_gate
  set completed_at = now()
  where user_id = current_user_id and completed_at is null;
end;
$;

revoke all on function public.complete_registration_submission() from public;
grant execute on function public.complete_registration_submission() to authenticated;

commit;
