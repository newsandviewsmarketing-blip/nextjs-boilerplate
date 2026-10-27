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

commit;
