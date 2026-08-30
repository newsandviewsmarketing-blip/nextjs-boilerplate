begin;

-- VetConnect release closure: assisted-entry media/documents and public-directory parity.
-- Run AFTER 202608300003_master_closure_operations.sql.

alter table public.companies
  add column if not exists registration_number text,
  add column if not exists cover_image_url text;

alter table public.laboratories
  add column if not exists logo_url text,
  add column if not exists cover_image_url text;

create table if not exists public.admin_record_documents (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('person','company','clinic','laboratory','product','job')),
  entity_id text not null,
  document_kind text not null default 'supporting_document',
  original_name text not null,
  mime_type text,
  storage_path text not null unique,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists admin_record_documents_entity_idx
  on public.admin_record_documents(entity_type, entity_id, created_at desc);

alter table public.admin_record_documents enable row level security;

drop policy if exists "admin_record_documents_admin_read" on public.admin_record_documents;
create policy "admin_record_documents_admin_read"
on public.admin_record_documents for select to authenticated
using (public.has_admin_permission('admin.view'));

drop policy if exists "admin_record_documents_admin_insert" on public.admin_record_documents;
create policy "admin_record_documents_admin_insert"
on public.admin_record_documents for insert to authenticated
with check (public.has_admin_permission('admin.view'));

drop policy if exists "admin_record_documents_admin_delete" on public.admin_record_documents;
create policy "admin_record_documents_admin_delete"
on public.admin_record_documents for delete to authenticated
using (public.has_admin_permission('admin.view'));

grant select, insert, delete on public.admin_record_documents to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'record-documents',
  'record-documents',
  false,
  10485760,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "record_documents_admin_select" on storage.objects;
create policy "record_documents_admin_select"
on storage.objects for select to authenticated
using (bucket_id = 'record-documents' and public.has_admin_permission('admin.view'));

drop policy if exists "record_documents_admin_insert" on storage.objects;
create policy "record_documents_admin_insert"
on storage.objects for insert to authenticated
with check (bucket_id = 'record-documents' and public.has_admin_permission('admin.view'));

drop policy if exists "record_documents_admin_update" on storage.objects;
create policy "record_documents_admin_update"
on storage.objects for update to authenticated
using (bucket_id = 'record-documents' and public.has_admin_permission('admin.view'))
with check (bucket_id = 'record-documents' and public.has_admin_permission('admin.view'));

drop policy if exists "record_documents_admin_delete" on storage.objects;
create policy "record_documents_admin_delete"
on storage.objects for delete to authenticated
using (bucket_id = 'record-documents' and public.has_admin_permission('admin.view'));

-- Keep laboratory media available through the public read model.
create or replace view public.public_laboratories with (security_barrier=true) as
select id,slug,laboratory_name,laboratory_type,description,city,province,address,public_phone,public_email,website,
       working_hours,emergency_service,species_served,tests_offered,true as profile_verified,
       accreditation_verification_status='approved' as accreditation_verified,
       district,tehsil,google_maps_url,logo_url,cover_image_url
from public.laboratories
where verification_status='approved' and is_published;

grant select on public.public_laboratories to anon,authenticated;


-- Canonical company support for marketplace enquiries created from staff-assisted products.
alter table public.product_inquiries alter column company_user_id drop not null;
alter table public.product_inquiries
  add column if not exists company_id uuid references public.companies(id) on delete set null;
create index if not exists product_inquiries_canonical_company_idx
  on public.product_inquiries(company_id, created_at desc);
update public.product_inquiries i set company_id=p.company_id
from public.products p where i.product_id=p.id and i.company_id is null;

drop policy if exists "inquiries_authenticated_insert" on public.product_inquiries;
create policy "inquiries_authenticated_insert"
on public.product_inquiries for insert to authenticated
with check (
  requester_id = (select auth.uid())
  and exists (
    select 1 from public.products p
    where p.id = product_inquiries.product_id
      and p.verification_status = 'approved'
      and p.is_published
      and (p.company_id is not distinct from product_inquiries.company_id)
      and (p.company_user_id is not distinct from product_inquiries.company_user_id)
  )
);

drop policy if exists inquiries_parties_or_admin_select on public.product_inquiries;
create policy inquiries_parties_or_admin_select
on public.product_inquiries for select to authenticated
using (
  requester_id = (select auth.uid())
  or (company_id is not null and public.company_has_permission(company_id, 'products.manage'))
  or (company_user_id is not null and public.legacy_company_has_permission(company_user_id, 'products.manage'))
  or public.is_admin()
);

drop policy if exists inquiries_company_or_admin_update on public.product_inquiries;
create policy inquiries_company_or_admin_update
on public.product_inquiries for update to authenticated
using (
  (company_id is not null and public.company_has_permission(company_id, 'products.manage'))
  or (company_user_id is not null and public.legacy_company_has_permission(company_user_id, 'products.manage'))
  or public.is_admin()
)
with check (
  (company_id is not null and public.company_has_permission(company_id, 'products.manage'))
  or (company_user_id is not null and public.legacy_company_has_permission(company_user_id, 'products.manage'))
  or public.is_admin()
);

-- Correct canonical employer display in the public jobs view.
create or replace view public.public_jobs with (security_barrier = true) as
select
  j.id, j.slug, j.title, j.description, j.sector, j.city, j.province,
  j.employment_type, j.minimum_qualification, j.minimum_experience, j.deadline,
  j.company_user_id,
  coalesce(c.canonical_name, cp.trade_name, cp.company_name, 'VetConnect Employer') as company_name,
  j.district, j.tehsil, j.address, j.company_id
from public.jobs j
left join public.companies c on c.id = j.company_id
left join public.company_profiles cp on cp.user_id = j.company_user_id
where j.verification_status = 'approved'
  and j.is_published
  and (c.id is null or (c.verification_status = 'approved' and c.is_published = true))
  and (cp.user_id is null or cp.verification_status = 'approved');
grant select on public.public_jobs to anon, authenticated;

commit;
