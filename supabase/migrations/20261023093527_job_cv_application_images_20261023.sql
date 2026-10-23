begin;
-- Applicant CV choices are private and bound to an individual application.
alter table public.job_applications add column if not exists cv_document_id uuid references public.career_documents(id) on delete set null;
alter table public.job_applications add column if not exists cv_source text;
alter table public.job_applications add column if not exists cv_snapshot jsonb;
alter table public.job_applications drop constraint if exists job_applications_cv_source_check;
alter table public.job_applications add constraint job_applications_cv_source_check
check (cv_source is null or cv_source in ('saved_cv','profile_cv'));

create table if not exists public.career_cv_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null,
 contact_email text,
 phone text,
 headline text,
 education text,
 experience text,
 skills text,
 updated_at timestamptz not null default now()
);
alter table public.career_cv_profiles enable row level security;
drop policy if exists career_cv_profiles_owner on public.career_cv_profiles;
create policy career_cv_profiles_owner on public.career_cv_profiles
 for all to authenticated using(user_id=(select auth.uid()))
 with check(user_id=(select auth.uid()));
grant select,insert,update,delete on public.career_cv_profiles to authenticated;

alter table public.jobs add column if not exists advert_image_path text;
alter table public.jobs add column if not exists advert_image_mime text;
alter table public.jobs drop constraint if exists jobs_advert_image_mime_check;
alter table public.jobs add constraint jobs_advert_image_mime_check
check (advert_image_mime is null or advert_image_mime in ('image/jpeg','image/png','image/webp'));

-- Private CV storage may be read by the owner, or by the employer
-- only when that exact CV was attached to their submitted application.
drop policy if exists career_documents_employer_selected_cv on storage.objects;
create policy career_documents_employer_selected_cv on storage.objects
for select to authenticated
using (
 bucket_id='career-documents' and exists (
  select 1 from public.career_documents cd
  join public.job_applications a on a.cv_document_id=cd.id
  where cd.file_path=storage.objects.name
  and public.can_manage_job_applicants(a.job_id)
 )
);

-- Job advertisement image uploads are private until job moderation approves
-- the job itself. Never expose generic job supporting documents.
drop policy if exists job_ads_owner_insert on storage.objects;
create policy job_ads_owner_insert on storage.objects for insert to authenticated
with check(bucket_id='record-documents'
 and (storage.foldername(name))[1]=(select auth.uid())::text
 and (storage.foldername(name))[2]='job-ad');

drop policy if exists job_ads_owner_select on storage.objects;
create policy job_ads_owner_select on storage.objects for select to authenticated
using(bucket_id='record-documents'
 and (storage.foldername(name))[1]=(select auth.uid())::text
 and (storage.foldername(name))[2]='job-ad');

drop policy if exists approved_job_ads_public_read on storage.objects;
create policy approved_job_ads_public_read on storage.objects for select to anon,authenticated
using(bucket_id='record-documents' and exists(
 select 1 from public.jobs j where j.advert_image_path=storage.objects.name
 and j.verification_status='approved' and j.is_published=true
 and (j.deadline is null or j.deadline>=current_date)
 and j.advert_image_mime in ('image/jpeg','image/png','image/webp')
));

create index if not exists job_applications_cv_idx on public.job_applications(cv_document_id)
where cv_document_id is not null;
commit;