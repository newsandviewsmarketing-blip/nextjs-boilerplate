begin;
create table if not exists public.guest_job_applications (
 id uuid primary key default gen_random_uuid(),
 job_id uuid not null references public.jobs(id) on delete cascade,
 applicant_name text not null check (char_length(trim(applicant_name)) between 2 and 120),
 applicant_email text not null check (char_length(applicant_email) <= 254),
 applicant_phone text,
 cover_note text check (char_length(coalesce(cover_note,''))<=2000),
 cv_storage_path text not null,
 cv_mime text not null check (cv_mime in ('application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/jpeg','image/png')),
 cv_original_filename text not null,
 email_token_hash text unique,
 token_expires_at timestamptz not null,
 email_verified_at timestamptz,
 status text not null default 'pending_email' check (status in ('pending_email','submitted')),
 consent_at timestamptz not null,
 ip_hash text not null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint guest_verified_state_check check (
 (status='submitted' and email_verified_at is not null and email_token_hash is null)
 or (status='pending_email' and email_verified_at is null and email_token_hash is not null)
 )
);
create index if not exists guest_application_ip_created_idx on public.guest_job_applications(ip_hash,created_at);
create index if not exists guest_application_email_created_idx on public.guest_job_applications(lower(applicant_email),created_at);
create index if not exists guest_application_job_verified_idx on public.guest_job_applications(job_id,email_verified_at) where email_verified_at is not null;
create unique index if not exists guest_application_one_verified_per_job_email_idx
 on public.guest_job_applications(job_id,lower(applicant_email)) where email_verified_at is not null;
alter table public.guest_job_applications enable row level security;
revoke all on public.guest_job_applications from anon,authenticated;
grant select on public.guest_job_applications to authenticated;
drop policy if exists guest_submitted_employer_read on public.guest_job_applications;
create policy guest_submitted_employer_read on public.guest_job_applications
 for select to authenticated using (
  status='submitted' and email_verified_at is not null
  and public.can_manage_job_applicants(job_id)
 );
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('guest-job-cvs','guest-job-cvs',false,5242880,
 array['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/jpeg','image/png'])
on conflict(id) do update set public=false,file_size_limit=5242880,
 allowed_mime_types=excluded.allowed_mime_types;
-- No anon/authenticated storage.objects policies: only trusted server role may upload/sign.
commit;