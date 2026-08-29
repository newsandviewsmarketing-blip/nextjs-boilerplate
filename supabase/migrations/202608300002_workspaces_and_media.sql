begin;

-- ============================================================
-- VetConnect Pakistan
-- Professional + clinic workspaces and private/public media
-- Run AFTER 202608300001_profile_standardization.sql.
-- This migration is additive and preserves existing records.
-- ============================================================

-- 1. Public/private visibility for professional credentials.
alter table public.professional_credentials
  add column if not exists visibility public.profile_visibility
  not null default 'owner_only';

create index if not exists professional_credentials_visibility_idx
  on public.professional_credentials(professional_user_id, visibility, verification_status);

-- 2. Clinic media fields used by the clinic workspace.
alter table public.clinics
  add column if not exists logo_url text,
  add column if not exists cover_image_url text;

-- 3. Storage buckets.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-media',
  'profile-media',
  true,
  5242880,
  array['image/jpeg','image/png','image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'career-documents',
  'career-documents',
  false,
  10485760,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 4. Storage RLS. Files are always written under auth.uid()/...
drop policy if exists "profile_media_owner_insert" on storage.objects;
create policy "profile_media_owner_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "profile_media_owner_update" on storage.objects;
create policy "profile_media_owner_update"
on storage.objects for update to authenticated
using (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "profile_media_owner_delete" on storage.objects;
create policy "profile_media_owner_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "career_documents_owner_select" on storage.objects;
create policy "career_documents_owner_select"
on storage.objects for select to authenticated
using (
  bucket_id = 'career-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "career_documents_owner_insert" on storage.objects;
create policy "career_documents_owner_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'career-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "career_documents_owner_update" on storage.objects;
create policy "career_documents_owner_update"
on storage.objects for update to authenticated
using (
  bucket_id = 'career-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'career-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "career_documents_owner_delete" on storage.objects;
create policy "career_documents_owner_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'career-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- 5. Public professional timeline visibility.
drop policy if exists "professional_education_public_read" on public.professional_education;
create policy "professional_education_public_read"
on public.professional_education for select to anon, authenticated
using (
  visibility = 'public'::public.profile_visibility
  and exists (
    select 1
    from public.professional_profiles pp
    join public.profiles p on p.id = pp.user_id
    where pp.user_id = professional_education.professional_user_id
      and p.account_status = 'active'
      and pp.verification_status = 'approved'::public.approval_status
      and pp.profile_visibility = 'public'::public.profile_visibility
  )
);

drop policy if exists "professional_experience_public_read" on public.professional_experience;
create policy "professional_experience_public_read"
on public.professional_experience for select to anon, authenticated
using (
  visibility = 'public'::public.profile_visibility
  and exists (
    select 1
    from public.professional_profiles pp
    join public.profiles p on p.id = pp.user_id
    where pp.user_id = professional_experience.professional_user_id
      and p.account_status = 'active'
      and pp.verification_status = 'approved'::public.approval_status
      and pp.profile_visibility = 'public'::public.profile_visibility
  )
);

drop policy if exists "professional_credentials_public_read" on public.professional_credentials;
create policy "professional_credentials_public_read"
on public.professional_credentials for select to anon, authenticated
using (
  visibility = 'public'::public.profile_visibility
  and verification_status = 'approved'::public.approval_status
  and exists (
    select 1
    from public.professional_profiles pp
    join public.profiles p on p.id = pp.user_id
    where pp.user_id = professional_credentials.professional_user_id
      and p.account_status = 'active'
      and pp.verification_status = 'approved'::public.approval_status
      and pp.profile_visibility = 'public'::public.profile_visibility
  )
);

grant select on public.professional_education,
  public.professional_experience,
  public.professional_credentials
to anon;

-- 6. Extend privacy-safe professional public view.
create or replace view public.public_professionals with (security_barrier = true) as
select
  pp.user_id,
  pp.slug,
  p.full_name,
  pp.professional_type,
  pp.headline,
  pp.current_position,
  pp.organization_name,
  coalesce(pp.city, p.city) as city,
  pp.province,
  pp.years_experience,
  pp.skills,
  true as profile_verified,
  pp.image_url,
  pp.public_summary,
  pp.district,
  pp.tehsil
from public.professional_profiles pp
join public.profiles p on p.id = pp.user_id
where p.account_status = 'active'
  and pp.verification_status = 'approved'::public.approval_status
  and pp.profile_visibility = 'public'::public.profile_visibility;

grant select on public.public_professionals to anon, authenticated;

-- 7. Extend privacy-safe clinic view with media + standardized location.
create or replace view public.public_clinics with (security_barrier = true) as
select
  id,
  slug,
  clinic_name,
  facility_type,
  description,
  city,
  province,
  address,
  public_phone,
  public_email,
  website,
  working_hours,
  emergency_service,
  services,
  species,
  true as profile_verified,
  district,
  tehsil,
  logo_url,
  cover_image_url
from public.clinics
where verification_status = 'approved'::public.approval_status
  and is_published;

grant select on public.public_clinics to anon, authenticated;

-- 8. Public access to normalized clinic services for approved/published clinics.
drop policy if exists "service_catalog_public_read" on public.service_catalog;
create policy "service_catalog_public_read"
on public.service_catalog for select to anon
using (is_active = true);

drop policy if exists "clinic_services_public_read" on public.clinic_services;
create policy "clinic_services_public_read"
on public.clinic_services for select to anon
using (
  is_active = true
  and is_public = true
  and exists (
    select 1
    from public.clinics c
    where c.id = clinic_services.clinic_id
      and c.verification_status = 'approved'::public.approval_status
      and c.is_published = true
  )
);

grant select on public.service_catalog, public.clinic_services to anon;

commit;
