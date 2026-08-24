-- VetConnect Pakistan Phase 3 master-data architecture
-- Run after 202608110002_phase3_foundation.sql.
-- Adds normalized company, product, career, connection and audit intelligence.

begin;

alter table public.company_profiles
  add column if not exists slug text unique,
  add column if not exists legal_name text,
  add column if not exists trade_name text,
  add column if not exists short_description text,
  add column if not exists cover_image_url text,
  add column if not exists owner_name text,
  add column if not exists chief_executive_name text,
  add column if not exists year_established integer,
  add column if not exists country text not null default 'Pakistan';

update public.company_profiles
set slug = public.slug_token(coalesce(trade_name, company_name, 'company')) || '-' || left(user_id::text, 8)
where slug is null;

create table if not exists public.company_roles (
  id uuid primary key default gen_random_uuid(),
  company_user_id uuid not null references public.company_profiles(user_id) on delete cascade,
  role_type text not null check (role_type in ('manufacturer','principal','importer','distributor','marketer','indentor','registration_holder','service_provider','third_party_manufacturer','dealer_supplier')),
  details text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_user_id, role_type)
);

create table if not exists public.company_sectors (
  company_user_id uuid not null references public.company_profiles(user_id) on delete cascade,
  sector text not null,
  subsectors text[] not null default '{}',
  created_at timestamptz not null default now(),
  primary key (company_user_id, sector)
);

create table if not exists public.company_locations (
  id uuid primary key default gen_random_uuid(),
  company_user_id uuid not null references public.company_profiles(user_id) on delete cascade,
  location_type text not null default 'Office',
  branch_name text,
  address text,
  city text,
  district text,
  province text,
  country text not null default 'Pakistan',
  latitude numeric(9,6),
  longitude numeric(9,6),
  public_phone text,
  public_email text,
  working_hours text,
  warehouse boolean not null default false,
  cold_chain boolean not null default false,
  service_areas text[] not null default '{}',
  notes text,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.company_contacts (
  id uuid primary key default gen_random_uuid(),
  company_user_id uuid not null references public.company_profiles(user_id) on delete cascade,
  location_id uuid references public.company_locations(id) on delete set null,
  full_name text not null,
  designation text,
  department text,
  representative_type text,
  mobile text,
  whatsapp text,
  office_phone text,
  email text,
  city text,
  province text,
  territory text,
  sector_responsibility text[] not null default '{}',
  product_responsibility text[] not null default '{}',
  is_public boolean not null default false,
  is_primary boolean not null default false,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.company_relationships (
  id uuid primary key default gen_random_uuid(),
  source_company_id uuid not null references public.company_profiles(user_id) on delete cascade,
  target_company_id uuid not null references public.company_profiles(user_id) on delete cascade,
  relationship_type text not null,
  territory text,
  product_scope text,
  start_date date,
  end_date date,
  status text not null default 'active' check (status in ('active','inactive','historical','disputed')),
  details text,
  verification_status public.approval_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (source_company_id <> target_company_id)
);

create table if not exists public.company_documents (
  id uuid primary key default gen_random_uuid(),
  company_user_id uuid not null references public.company_profiles(user_id) on delete cascade,
  document_type text not null,
  file_path text not null,
  visibility public.profile_visibility not null default 'admin_only',
  verification_status public.approval_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products
  add column if not exists product_code text,
  add column if not exists subclass text,
  add column if not exists therapeutic_class text,
  add column if not exists sectors text[] not null default '{}',
  add column if not exists species text[] not null default '{}',
  add column if not exists production_systems text[] not null default '{}',
  add column if not exists use_areas text[] not null default '{}',
  add column if not exists routes text[] not null default '{}',
  add column if not exists precautions text,
  add column if not exists contraindications text,
  add column if not exists warnings text,
  add column if not exists side_effects text,
  add column if not exists interactions text,
  add column if not exists meat_withdrawal text,
  add column if not exists milk_withdrawal text,
  add column if not exists egg_withdrawal text,
  add column if not exists cold_chain boolean not null default false,
  add column if not exists temperature_range text,
  add column if not exists shelf_life text,
  add column if not exists transport_caution text,
  add column if not exists country_of_origin text,
  add column if not exists launch_status text,
  add column if not exists supply_notes text,
  add column if not exists regulatory_review_status text not null default 'not_provided' check (regulatory_review_status in ('not_provided','pending','verified','not_applicable','returned'));

create table if not exists public.product_company_relationships (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  company_user_id uuid not null references public.company_profiles(user_id) on delete cascade,
  relationship_type text not null,
  territory text,
  start_date date,
  end_date date,
  details text,
  verification_status public.approval_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text,
  barcode text,
  pack_size text not null,
  strength text,
  dosage_form text,
  availability text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  media_type text not null check (media_type in ('primary_image','gallery','pack','bottle','carton','label','brochure','technical_literature','video')),
  url text not null,
  alt_text text,
  display_order integer not null default 0,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.product_regulatory (
  product_id uuid primary key references public.products(id) on delete cascade,
  company_user_id uuid not null references public.company_profiles(user_id) on delete cascade,
  applicability text,
  registration_status text,
  registration_number text,
  registration_holder_id uuid references public.company_profiles(user_id) on delete set null,
  evidence_path text,
  verification_status text not null default 'not_provided' check (verification_status in ('not_provided','pending','verified','not_applicable','returned')),
  reviewer_notes text,
  verified_at timestamptz,
  verified_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.candidate_preferences (
  professional_user_id uuid primary key references public.professional_profiles(user_id) on delete cascade,
  preferred_job_types text[] not null default '{}',
  preferred_sectors text[] not null default '{}',
  preferred_cities text[] not null default '{}',
  expected_career_level text,
  availability text,
  recruiter_visibility public.profile_visibility not null default 'owner_only',
  updated_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  company_user_id uuid not null references public.company_profiles(user_id) on delete cascade,
  slug text not null unique,
  title text not null,
  description text not null,
  sector text,
  city text,
  province text,
  employment_type text not null,
  minimum_qualification text,
  minimum_experience integer not null default 0,
  deadline date,
  verification_status public.approval_status not null default 'pending',
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.job_requirements (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  requirement_type text not null,
  value text not null,
  weight numeric(5,2) not null default 1,
  is_required boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  candidate_user_id uuid not null references public.professional_profiles(user_id) on delete cascade,
  status text not null default 'applied' check (status in ('applied','viewed','shortlisted','interview','hold','selected','rejected','withdrawn')),
  cover_note text,
  applied_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, candidate_user_id)
);

create table if not exists public.job_matches (
  job_id uuid not null references public.jobs(id) on delete cascade,
  candidate_user_id uuid not null references public.professional_profiles(user_id) on delete cascade,
  match_score numeric(5,2) not null check (match_score between 0 and 100),
  explanation text not null,
  factors jsonb not null default '{}'::jsonb,
  calculated_at timestamptz not null default now(),
  primary key (job_id, candidate_user_id)
);

create table if not exists public.saved_jobs (
  user_id uuid not null references public.profiles(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, job_id)
);

create table if not exists public.connection_requests (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  purpose text not null,
  status text not null default 'pending' check (status in ('pending','accepted','declined','closed')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> recipient_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.connection_requests(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.contact_events (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.connection_requests(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null check (event_type in ('whatsapp_click','phone_click','email_click','profile_view','cv_unlock')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.verification_records (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  verification_type text not null,
  status public.approval_status not null default 'pending',
  source text,
  evidence_path text,
  notes text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.export_logs (
  id uuid primary key default gen_random_uuid(),
  exported_by uuid not null references public.profiles(id) on delete restrict,
  entity_type text not null,
  reason text not null,
  filters jsonb not null default '{}'::jsonb,
  exported_fields text[] not null default '{}',
  record_count integer not null default 0 check (record_count >= 0),
  created_at timestamptz not null default now()
);

create index if not exists company_roles_company_idx on public.company_roles(company_user_id, is_active);
create index if not exists company_locations_filter_idx on public.company_locations(city, province, warehouse, cold_chain);
create index if not exists company_contacts_company_idx on public.company_contacts(company_user_id, is_active);
create index if not exists product_relationships_product_idx on public.product_company_relationships(product_id, relationship_type);
create index if not exists jobs_public_idx on public.jobs(verification_status, is_published, sector, city, deadline);
create index if not exists applications_company_pipeline_idx on public.job_applications(job_id, status, applied_at);
create index if not exists connections_parties_idx on public.connection_requests(requester_id, recipient_id, status);
create index if not exists export_logs_admin_idx on public.export_logs(exported_by, created_at desc);

create or replace function public.protect_job_approval_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user not in ('postgres', 'service_role', 'supabase_admin')
    and not public.is_admin() and (
      new.verification_status is distinct from old.verification_status or
      new.is_published is distinct from old.is_published
    ) then
    raise exception 'Only an authorized administrator can review or publish a job';
  end if;
  return new;
end;
$$;

create or replace function public.protect_product_regulatory_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and current_user not in ('postgres', 'service_role', 'supabase_admin')
    and not public.is_admin() and new.verification_status <> 'pending' then
    raise exception 'Submitted regulatory information must begin in pending review';
  elsif tg_op = 'UPDATE' and current_user not in ('postgres', 'service_role', 'supabase_admin')
    and not public.is_admin() and (
      new.verification_status is distinct from old.verification_status or
      new.reviewer_notes is distinct from old.reviewer_notes or
      new.verified_at is distinct from old.verified_at or
      new.verified_by is distinct from old.verified_by
    ) then
    raise exception 'Only an authorized verification administrator can review regulatory information';
  end if;
  if tg_op = 'UPDATE' and current_user not in ('postgres', 'service_role', 'supabase_admin')
    and not public.is_admin() and (
      new.applicability is distinct from old.applicability or
      new.registration_status is distinct from old.registration_status or
      new.registration_number is distinct from old.registration_number or
      new.registration_holder_id is distinct from old.registration_holder_id or
      new.evidence_path is distinct from old.evidence_path
    ) then
    new.verification_status := 'pending';
    new.reviewer_notes := null;
    new.verified_at := null;
    new.verified_by := null;
  end if;
  return new;
end;
$$;

drop trigger if exists jobs_protect_approval on public.jobs;
create trigger jobs_protect_approval before update on public.jobs for each row execute procedure public.protect_job_approval_fields();
drop trigger if exists product_regulatory_protect_review on public.product_regulatory;
create trigger product_regulatory_protect_review before insert or update on public.product_regulatory for each row execute procedure public.protect_product_regulatory_fields();

do $$
declare table_name text;
begin
  foreach table_name in array array['company_roles','company_locations','company_contacts','company_relationships','company_documents','product_company_relationships','product_variants','product_regulatory','candidate_preferences','jobs','job_applications']
  loop
    execute format('drop trigger if exists %I_set_updated_at on public.%I', table_name, table_name);
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute procedure public.set_updated_at()', table_name, table_name);
  end loop;
end $$;

alter table public.company_roles enable row level security;
alter table public.company_sectors enable row level security;
alter table public.company_locations enable row level security;
alter table public.company_contacts enable row level security;
alter table public.company_relationships enable row level security;
alter table public.company_documents enable row level security;
alter table public.product_company_relationships enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_media enable row level security;
alter table public.product_regulatory enable row level security;
alter table public.candidate_preferences enable row level security;
alter table public.jobs enable row level security;
alter table public.job_requirements enable row level security;
alter table public.job_applications enable row level security;
alter table public.job_matches enable row level security;
alter table public.saved_jobs enable row level security;
alter table public.connection_requests enable row level security;
alter table public.messages enable row level security;
alter table public.contact_events enable row level security;
alter table public.verification_records enable row level security;
alter table public.export_logs enable row level security;

drop policy if exists "company_roles_owner_or_admin" on public.company_roles;
drop policy if exists "company_sectors_owner_or_admin" on public.company_sectors;
drop policy if exists "company_locations_owner_or_admin" on public.company_locations;
drop policy if exists "company_contacts_owner_or_admin" on public.company_contacts;
drop policy if exists "company_relationships_party_or_admin" on public.company_relationships;
drop policy if exists "company_documents_owner_or_admin" on public.company_documents;
drop policy if exists "product_company_relationship_owner_or_admin" on public.product_company_relationships;
drop policy if exists "product_variants_owner_or_admin" on public.product_variants;
drop policy if exists "product_media_public_or_owner" on public.product_media;
drop policy if exists "product_media_owner_manage" on public.product_media;
drop policy if exists "product_regulatory_owner_or_admin" on public.product_regulatory;
drop policy if exists "candidate_preferences_owner_or_admin" on public.candidate_preferences;
drop policy if exists "jobs_public_owner_or_admin_select" on public.jobs;
drop policy if exists "jobs_company_insert" on public.jobs;
drop policy if exists "jobs_company_or_admin_update" on public.jobs;
drop policy if exists "jobs_company_pending_delete" on public.jobs;
drop policy if exists "job_requirements_owner_or_admin" on public.job_requirements;
drop policy if exists "applications_candidate_or_employer" on public.job_applications;
drop policy if exists "applications_candidate_insert" on public.job_applications;
drop policy if exists "applications_parties_update" on public.job_applications;
drop policy if exists "job_matches_parties" on public.job_matches;
drop policy if exists "saved_jobs_owner" on public.saved_jobs;
drop policy if exists "connections_parties" on public.connection_requests;
drop policy if exists "connections_requester_insert" on public.connection_requests;
drop policy if exists "connections_parties_update" on public.connection_requests;
drop policy if exists "messages_connection_parties" on public.messages;
drop policy if exists "messages_sender_insert" on public.messages;
drop policy if exists "contact_events_actor_insert" on public.contact_events;
drop policy if exists "contact_events_admin_select" on public.contact_events;
drop policy if exists "verification_records_admin" on public.verification_records;
drop policy if exists "export_logs_admin" on public.export_logs;

create policy "company_roles_owner_or_admin" on public.company_roles for all to authenticated using (company_user_id = (select auth.uid()) or public.is_admin()) with check (company_user_id = (select auth.uid()) or public.is_admin());
create policy "company_sectors_owner_or_admin" on public.company_sectors for all to authenticated using (company_user_id = (select auth.uid()) or public.is_admin()) with check (company_user_id = (select auth.uid()) or public.is_admin());
create policy "company_locations_owner_or_admin" on public.company_locations for all to authenticated using (company_user_id = (select auth.uid()) or public.is_admin()) with check (company_user_id = (select auth.uid()) or public.is_admin());
create policy "company_contacts_owner_or_admin" on public.company_contacts for all to authenticated using (company_user_id = (select auth.uid()) or public.is_admin()) with check (company_user_id = (select auth.uid()) or public.is_admin());
create policy "company_relationships_party_or_admin" on public.company_relationships for all to authenticated using (source_company_id = (select auth.uid()) or target_company_id = (select auth.uid()) or public.is_admin()) with check (source_company_id = (select auth.uid()) or public.is_admin());
create policy "company_documents_owner_or_admin" on public.company_documents for all to authenticated using (company_user_id = (select auth.uid()) or public.is_admin()) with check (company_user_id = (select auth.uid()) or public.is_admin());

create policy "product_company_relationship_owner_or_admin" on public.product_company_relationships for all to authenticated using (company_user_id = (select auth.uid()) or public.is_admin()) with check (company_user_id = (select auth.uid()) or public.is_admin());
create policy "product_variants_owner_or_admin" on public.product_variants for all to authenticated using (exists (select 1 from public.products p where p.id = product_variants.product_id and (p.company_user_id = (select auth.uid()) or public.is_admin()))) with check (exists (select 1 from public.products p where p.id = product_variants.product_id and (p.company_user_id = (select auth.uid()) or public.is_admin())));
create policy "product_media_public_or_owner" on public.product_media for select to anon, authenticated using (is_public and exists (select 1 from public.products p where p.id = product_media.product_id and p.verification_status = 'approved' and p.is_published) or exists (select 1 from public.products p where p.id = product_media.product_id and (p.company_user_id = (select auth.uid()) or public.is_admin())));
create policy "product_media_owner_manage" on public.product_media for all to authenticated using (exists (select 1 from public.products p where p.id = product_media.product_id and (p.company_user_id = (select auth.uid()) or public.is_admin()))) with check (exists (select 1 from public.products p where p.id = product_media.product_id and (p.company_user_id = (select auth.uid()) or public.is_admin())));
create policy "product_regulatory_owner_or_admin" on public.product_regulatory for all to authenticated using (company_user_id = (select auth.uid()) or public.is_admin()) with check (company_user_id = (select auth.uid()) or public.is_admin());

create policy "candidate_preferences_owner_or_admin" on public.candidate_preferences for all to authenticated using (professional_user_id = (select auth.uid()) or public.is_admin()) with check (professional_user_id = (select auth.uid()) or public.is_admin());
create policy "jobs_public_owner_or_admin_select" on public.jobs for select to anon, authenticated using ((verification_status = 'approved' and is_published) or company_user_id = (select auth.uid()) or public.is_admin());
create policy "jobs_company_insert" on public.jobs for insert to authenticated with check (company_user_id = (select auth.uid()) and exists (select 1 from public.company_profiles c where c.user_id = (select auth.uid()) and c.verification_status = 'approved'));
create policy "jobs_company_or_admin_update" on public.jobs for update to authenticated using (company_user_id = (select auth.uid()) or public.is_admin()) with check (company_user_id = (select auth.uid()) or public.is_admin());
create policy "jobs_company_pending_delete" on public.jobs for delete to authenticated using ((company_user_id = (select auth.uid()) and verification_status <> 'approved') or public.is_admin());
create policy "job_requirements_owner_or_admin" on public.job_requirements for all to authenticated using (exists (select 1 from public.jobs j where j.id = job_requirements.job_id and (j.company_user_id = (select auth.uid()) or public.is_admin()))) with check (exists (select 1 from public.jobs j where j.id = job_requirements.job_id and (j.company_user_id = (select auth.uid()) or public.is_admin())));
create policy "applications_candidate_or_employer" on public.job_applications for select to authenticated using (candidate_user_id = (select auth.uid()) or exists (select 1 from public.jobs j where j.id = job_applications.job_id and j.company_user_id = (select auth.uid())) or public.is_admin());
create policy "applications_candidate_insert" on public.job_applications for insert to authenticated with check (candidate_user_id = (select auth.uid()) and exists (select 1 from public.jobs j where j.id = job_applications.job_id and j.verification_status = 'approved' and j.is_published));
create policy "applications_parties_update" on public.job_applications for update to authenticated using (candidate_user_id = (select auth.uid()) or exists (select 1 from public.jobs j where j.id = job_applications.job_id and j.company_user_id = (select auth.uid())) or public.is_admin());
create policy "job_matches_parties" on public.job_matches for select to authenticated using (candidate_user_id = (select auth.uid()) or exists (select 1 from public.jobs j where j.id = job_matches.job_id and j.company_user_id = (select auth.uid())) or public.is_admin());
create policy "saved_jobs_owner" on public.saved_jobs for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "connections_parties" on public.connection_requests for select to authenticated using (requester_id = (select auth.uid()) or recipient_id = (select auth.uid()) or public.is_admin());
create policy "connections_requester_insert" on public.connection_requests for insert to authenticated with check (requester_id = (select auth.uid()));
create policy "connections_parties_update" on public.connection_requests for update to authenticated using (requester_id = (select auth.uid()) or recipient_id = (select auth.uid()) or public.is_admin());
create policy "messages_connection_parties" on public.messages for select to authenticated using (exists (select 1 from public.connection_requests c where c.id = messages.connection_id and (c.requester_id = (select auth.uid()) or c.recipient_id = (select auth.uid()) or public.is_admin())));
create policy "messages_sender_insert" on public.messages for insert to authenticated with check (sender_id = (select auth.uid()) and exists (select 1 from public.connection_requests c where c.id = messages.connection_id and c.status = 'accepted' and (c.requester_id = (select auth.uid()) or c.recipient_id = (select auth.uid()))));
create policy "contact_events_actor_insert" on public.contact_events for insert to authenticated with check (actor_id = (select auth.uid()) and exists (select 1 from public.connection_requests c where c.id = contact_events.connection_id and (c.requester_id = (select auth.uid()) or c.recipient_id = (select auth.uid()))));
create policy "contact_events_admin_select" on public.contact_events for select to authenticated using (public.is_admin());
create policy "verification_records_admin" on public.verification_records for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "export_logs_admin" on public.export_logs for all to authenticated using (public.is_admin()) with check (public.is_admin() and exported_by = (select auth.uid()));

create or replace view public.public_companies with (security_barrier = true) as
select c.user_id, coalesce(c.trade_name, c.company_name) as company_name, c.business_type, c.city, c.address, coalesce(c.short_description, c.description) as description, c.website, c.contact_email, c.logo_url, c.slug, c.legal_name, c.cover_image_url, c.year_established, c.country
from public.company_profiles c join public.profiles p on p.id = c.user_id
where p.account_status = 'active' and c.verification_status = 'approved';

create or replace view public.public_jobs with (security_barrier = true) as
select j.id, j.slug, j.title, j.description, j.sector, j.city, j.province, j.employment_type, j.minimum_qualification, j.minimum_experience, j.deadline, j.company_user_id, coalesce(c.trade_name, c.company_name) as company_name
from public.jobs j join public.company_profiles c on c.user_id = j.company_user_id
where j.verification_status = 'approved' and j.is_published and c.verification_status = 'approved';

grant select on public.public_companies, public.public_jobs to anon, authenticated;
grant select, insert, update, delete on public.company_roles, public.company_sectors, public.company_locations, public.company_contacts, public.company_relationships, public.company_documents, public.product_company_relationships, public.product_variants, public.product_media, public.product_regulatory, public.candidate_preferences, public.jobs, public.job_requirements, public.job_applications, public.job_matches, public.saved_jobs, public.connection_requests, public.messages, public.contact_events, public.verification_records, public.export_logs to authenticated;
grant select on public.jobs, public.product_media to anon;

commit;
