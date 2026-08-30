-- VetConnect Pakistan Master Closure
-- 30 August 2026
-- Run AFTER 202608300002_workspaces_and_media.sql.
-- Additive operational layer for delegated administration, assisted entry,
-- database-driven master data, canonical business/facility records, appointments
-- and laboratory requests. Existing 001/002 migrations must NOT be rerun.

begin;

-- =========================================================
-- 1. Delegated administrator permissions
-- =========================================================
create table if not exists public.admin_user_permissions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  granted_permissions text[] not null default '{}'::text[],
  revoked_permissions text[] not null default '{}'::text[],
  assigned_by uuid references public.profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_user_permissions enable row level security;
drop policy if exists "admin_user_permissions_read" on public.admin_user_permissions;
create policy "admin_user_permissions_read" on public.admin_user_permissions
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_super_admin());
drop policy if exists "admin_user_permissions_super_manage" on public.admin_user_permissions;
create policy "admin_user_permissions_super_manage" on public.admin_user_permissions
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());
grant select, insert, update, delete on public.admin_user_permissions to authenticated;

create or replace function public.has_admin_permission(
  check_permission text,
  check_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with role_access as (
    select coalesce(bool_or(check_permission = any(arp.permissions)), false) as allowed
    from public.user_roles ur
    join public.admin_role_permissions arp on arp.role = ur.role
    where ur.user_id = check_user_id
  ), individual as (
    select
      coalesce(check_permission = any(granted_permissions), false) as granted,
      coalesce(check_permission = any(revoked_permissions), false) as revoked
    from public.admin_user_permissions
    where user_id = check_user_id
  )
  select case
    when coalesce((select revoked from individual), false) then false
    when coalesce((select granted from individual), false) then true
    else coalesce((select allowed from role_access), false)
  end;
$$;
grant execute on function public.has_admin_permission(text, uuid) to anon, authenticated;

-- Keep role defaults useful, while Super Admin can narrow or extend per staff member.
update public.admin_role_permissions set permissions = array[
  'admin.view','profiles.review','regulatory.review','products.manage','products.delete',
  'jobs.manage','users.manage','audit.view','analytics.view','review.analytics',
  'profiles.create','companies.create','clinics.manage','laboratories.manage',
  'products.create','jobs.create','master_data.manage','directories.manage'
]::text[], updated_at = now() where role = 'super_admin';

update public.admin_role_permissions set permissions = array[
  'admin.view','profiles.review','regulatory.review','review.analytics',
  'profiles.create','clinics.manage','laboratories.manage','directories.manage'
]::text[], updated_at = now() where role = 'verification_officer';

update public.admin_role_permissions set permissions = array[
  'admin.view','products.manage','jobs.manage','products.create','jobs.create',
  'companies.create','directories.manage'
]::text[], updated_at = now() where role = 'content_admin';

update public.admin_role_permissions set permissions = array[
  'admin.view','jobs.manage','jobs.create'
]::text[], updated_at = now() where role = 'career_admin';

-- =========================================================
-- 2. Database-driven master data
-- =========================================================
create table if not exists public.master_data_items (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  parent_id uuid references public.master_data_items(id) on delete cascade,
  code text,
  label text not null,
  slug text,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- NULL parent_id needs a separate uniqueness rule in Postgres.
create unique index if not exists master_data_root_unique
  on public.master_data_items(category, lower(label)) where parent_id is null;
create unique index if not exists master_data_child_unique
  on public.master_data_items(category, parent_id, lower(label)) where parent_id is not null;
create index if not exists master_data_category_idx
  on public.master_data_items(category, is_active, sort_order, label);
create index if not exists master_data_parent_idx
  on public.master_data_items(parent_id, is_active, sort_order);

alter table public.master_data_items enable row level security;
drop policy if exists "master_data_read" on public.master_data_items;
create policy "master_data_read" on public.master_data_items
  for select to anon, authenticated using (is_active = true or public.has_admin_permission('master_data.manage'));
drop policy if exists "master_data_manage" on public.master_data_items;
create policy "master_data_manage" on public.master_data_items
  for all to authenticated using (public.has_admin_permission('master_data.manage'))
  with check (public.has_admin_permission('master_data.manage'));
grant select on public.master_data_items to anon, authenticated;
grant insert, update, delete on public.master_data_items to authenticated;

-- Seed reusable vocabulary. Admin Data Studio can extend it without deployment.
insert into public.master_data_items(category, code, label, sort_order) values
 ('veterinary_sector','poultry','Poultry',10),
 ('veterinary_sector','dairy_cattle','Dairy / Cattle',20),
 ('veterinary_sector','livestock_small_ruminants','Livestock / Small Ruminants',30),
 ('veterinary_sector','companion_animals','Pets / Companion Animals',40),
 ('veterinary_sector','equine','Equine',50),
 ('veterinary_sector','aquaculture_fisheries','Aquaculture / Fisheries',60),
 ('veterinary_sector','public_health_one_health','Public Health / One Health',70),
 ('veterinary_sector','diagnostics_laboratory','Diagnostics / Laboratory',80),
 ('veterinary_sector','feed_nutrition','Feed / Nutrition',90),
 ('veterinary_sector','wildlife_zoo','Wildlife / Zoo',100),
 ('veterinary_sector','pharmaceutical_industry','Pharmaceutical / Industry',110),
 ('veterinary_sector','academia_research','Academia / Research',120),
 ('veterinary_service','clinical_consultation','Clinical consultation',10),
 ('veterinary_service','farm_visit','Farm visit',20),
 ('veterinary_service','vaccination','Vaccination',30),
 ('veterinary_service','disease_diagnosis','Disease diagnosis',40),
 ('veterinary_service','treatment','Treatment',50),
 ('veterinary_service','surgery','Surgery',60),
 ('veterinary_service','reproductive_services','Reproductive services',70),
 ('veterinary_service','nutrition_advisory','Nutrition advisory',80),
 ('veterinary_service','biosecurity_audit','Biosecurity audit',90),
 ('veterinary_service','laboratory_interpretation','Laboratory interpretation',100),
 ('veterinary_service','herd_flock_health','Herd/flock health planning',110),
 ('veterinary_service','tele_consultation','Tele-consultation',120),
 ('veterinary_service','training','Training',130),
 ('veterinary_service','technical_consultancy','Technical consultancy',140),
 ('business_type','veterinary_pharmaceuticals','Veterinary Pharmaceuticals',10),
 ('business_type','feed_nutrition','Feed & Nutrition',20),
 ('business_type','poultry_livestock','Poultry & Livestock',30),
 ('business_type','diagnostics_laboratory','Diagnostics & Laboratory',40),
 ('business_type','equipment_technology','Equipment & Technology',50),
 ('facility_type','veterinary_clinic','Veterinary Clinic',10),
 ('facility_type','pet_clinic','Pet Clinic',20),
 ('facility_type','veterinary_hospital','Veterinary Hospital',30),
 ('facility_type','livestock_service_center','Livestock Service Centre',40),
 ('laboratory_type','diagnostic','Diagnostic Laboratory',10),
 ('laboratory_type','analytical','Analytical Laboratory',20),
 ('laboratory_type','food_safety','Food Safety Laboratory',30),
 ('laboratory_test','pcr','PCR',10),
 ('laboratory_test','elisa','ELISA',20),
 ('laboratory_test','microbiology','Microbiology',30),
 ('laboratory_test','serology','Serology',40),
 ('laboratory_test','feed_analysis','Feed analysis',50),
 ('laboratory_test','milk_testing','Milk testing',60),
 ('laboratory_test','water_testing','Water testing',70),
 ('species','poultry','Poultry',10),('species','cattle','Cattle',20),('species','buffalo','Buffalo',30),
 ('species','sheep','Sheep',40),('species','goat','Goat',50),('species','dog','Dog',60),
 ('species','cat','Cat',70),('species','equine','Equine',80),('species','fish','Fish',90),
 ('product_category','medicines','Medicines',10),('product_category','vaccines','Vaccines',20),
 ('product_category','feed_additives','Feed Additives',30),('product_category','nutritional_supplements','Nutritional Supplements',40),
 ('product_category','diagnostics','Diagnostics',50),('product_category','disinfectants','Disinfectants',60),
 ('product_dosage_form','oral_solution','Oral solution',10),('product_dosage_form','injectable','Injectable',20),
 ('product_dosage_form','powder','Powder',30),('product_dosage_form','tablet','Tablet',40),
 ('product_dosage_form','bolus','Bolus',50),('product_dosage_form','premix','Premix',60),
 ('product_dosage_form','vaccine','Vaccine',70),('product_dosage_form','disinfectant','Disinfectant',80),
 ('product_presentation','liquid','Liquid',10),('product_presentation','powder','Powder',20),
 ('product_presentation','tablet_bolus','Tablet / Bolus',30),('product_presentation','vial','Vial',40),
 ('product_presentation','bottle','Bottle',50),
 ('product_packaging','ml','ml',10),('product_packaging','litre','Litre',20),('product_packaging','gram','Gram',30),
 ('product_packaging','kg','Kg',40),('product_packaging','vial','Vial',50),('product_packaging','bottle','Bottle',60),
 ('product_packaging','sachet','Sachet',70),('product_packaging','bag','Bag',80),('product_packaging','dose','Doses',90),
 ('vaccine_type','live','Live vaccine',10),('vaccine_type','inactivated','Inactivated vaccine',20),
 ('vaccine_type','recombinant','Recombinant vaccine',30),('vaccine_type','vector','Vector vaccine',40),
 ('concentration_unit','mg_ml','mg/ml',10),('concentration_unit','percent','%',20),
 ('concentration_unit','iu_ml','IU/ml',30),('concentration_unit','dose','Dose',40),
 ('administration_route','oral','Oral',10),('administration_route','im','Intramuscular (IM)',20),
 ('administration_route','sc','Subcutaneous (SC)',30),('administration_route','iv','Intravenous (IV)',40),
 ('administration_route','drinking_water','Drinking water',50),('administration_route','spray','Spray',60),
 ('administration_route','eye_drop','Eye drop',70),('administration_route','in_ovo','In ovo',80),
 ('job_sector','poultry','Poultry',10),('job_sector','dairy','Dairy',20),('job_sector','livestock','Livestock',30),
 ('job_sector','pets','Pets / Companion Animals',40),('job_sector','pharma','Pharmaceutical / Industry',50),
 ('job_sector','academia','Academia / Research',60),('job_sector','laboratory','Laboratory / Diagnostics',70),
 ('employment_type','full_time','Full-time',10),('employment_type','part_time','Part-time',20),
 ('employment_type','contract','Contract',30),('employment_type','internship','Internship',40)
on conflict do nothing;

-- Specialization parent/child values.
with s as (select id,label from public.master_data_items where category='veterinary_sector' and parent_id is null)
insert into public.master_data_items(category,parent_id,label,sort_order)
select 'veterinary_specialization', s.id, v.specialization, v.sort_order
from s join (values
 ('Poultry','Poultry Health & Disease',10),('Poultry','Poultry Production',20),('Poultry','Poultry Nutrition',30),('Poultry','Poultry Pathology',40),('Poultry','Hatchery & Breeder Management',50),('Poultry','Poultry Biosecurity',60),
 ('Dairy / Cattle','Dairy Herd Health',10),('Dairy / Cattle','Bovine Medicine',20),('Dairy / Cattle','Dairy Production',30),('Dairy / Cattle','Mastitis Control',40),('Dairy / Cattle','Reproduction & Theriogenology',50),('Dairy / Cattle','Dairy Nutrition',60),
 ('Livestock / Small Ruminants','Large Animal Medicine',10),('Livestock / Small Ruminants','Small Ruminant Medicine',20),('Livestock / Small Ruminants','Livestock Production',30),('Livestock / Small Ruminants','Reproduction & Theriogenology',40),('Livestock / Small Ruminants','Herd Health',50),('Livestock / Small Ruminants','Field Veterinary Practice',60),
 ('Pets / Companion Animals','Small Animal Medicine',10),('Pets / Companion Animals','Small Animal Surgery',20),('Pets / Companion Animals','Dermatology',30),('Pets / Companion Animals','Cardiology',40),('Pets / Companion Animals','Orthopedics',50),('Pets / Companion Animals','Diagnostic Imaging',60),('Pets / Companion Animals','Emergency & Critical Care',70),
 ('Equine','Equine Medicine',10),('Equine','Equine Surgery',20),('Equine','Equine Reproduction',30),('Equine','Sports Medicine',40),
 ('Aquaculture / Fisheries','Aquatic Animal Health',10),('Aquaculture / Fisheries','Fish Pathology',20),('Aquaculture / Fisheries','Aquaculture Production',30),('Aquaculture / Fisheries','Aquatic Nutrition',40),
 ('Public Health / One Health','Veterinary Public Health',10),('Public Health / One Health','Food Safety',20),('Public Health / One Health','Epidemiology',30),('Public Health / One Health','Zoonoses',40),('Public Health / One Health','One Health',50),('Public Health / One Health','Disease Surveillance',60),
 ('Diagnostics / Laboratory','Veterinary Pathology',10),('Diagnostics / Laboratory','Microbiology',20),('Diagnostics / Laboratory','Parasitology',30),('Diagnostics / Laboratory','Virology',40),('Diagnostics / Laboratory','Molecular Diagnostics',50),('Diagnostics / Laboratory','Clinical Pathology',60),
 ('Feed / Nutrition','Animal Nutrition',10),('Feed / Nutrition','Feed Formulation',20),('Feed / Nutrition','Feed Safety',30),('Feed / Nutrition','Mycotoxin Management',40),
 ('Wildlife / Zoo','Wildlife Medicine',10),('Wildlife / Zoo','Zoo Animal Medicine',20),('Wildlife / Zoo','Conservation Medicine',30),
 ('Pharmaceutical / Industry','Technical Services',10),('Pharmaceutical / Industry','Regulatory Affairs',20),('Pharmaceutical / Industry','Veterinary Pharmaceuticals',30),('Pharmaceutical / Industry','Vaccines & Biologics',40),('Pharmaceutical / Industry','Sales & Marketing',50),
 ('Academia / Research','Teaching',10),('Academia / Research','Clinical Research',20),('Academia / Research','Animal Health Research',30),('Academia / Research','Epidemiological Research',40),('Academia / Research','Veterinary Extension',50)
) v(sector,specialization,sort_order) on v.sector=s.label
on conflict do nothing;

-- =========================================================
-- 3. Staff-assisted professional/veterinarian directory records
-- =========================================================
create table if not exists public.managed_people (
  id uuid primary key default gen_random_uuid(),
  profile_kind text not null default 'professional' check (profile_kind in ('professional','veterinarian')),
  full_name text not null,
  slug text not null unique,
  contact_email text,
  public_phone text,
  qualifications text,
  professional_type text,
  headline text,
  public_summary text,
  current_position text,
  organization_name text,
  pvmc_number text,
  veterinary_sector text,
  specialization text,
  services text[] not null default '{}',
  skills text[] not null default '{}',
  years_experience integer not null default 0 check (years_experience >= 0),
  province text,
  district text,
  tehsil text,
  city text,
  address text,
  google_maps_url text,
  image_url text,
  verification_status public.approval_status not null default 'pending',
  pvmc_verification_status public.approval_status not null default 'pending',
  is_published boolean not null default false,
  claimed_by uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  verified_by uuid references public.profiles(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists managed_people_public_idx on public.managed_people(profile_kind,verification_status,pvmc_verification_status,is_published);
create index if not exists managed_people_geo_idx on public.managed_people(province,district,tehsil,city);
alter table public.managed_people enable row level security;
drop policy if exists "managed_people_public_or_admin_read" on public.managed_people;
create policy "managed_people_public_or_admin_read" on public.managed_people for select to anon,authenticated
using (
  (is_published and verification_status='approved' and (profile_kind='professional' or pvmc_verification_status='approved'))
  or public.has_admin_permission('directories.manage')
  or public.has_admin_permission('profiles.review')
);
drop policy if exists "managed_people_admin_manage" on public.managed_people;
create policy "managed_people_admin_manage" on public.managed_people for all to authenticated
using (public.has_admin_permission('profiles.create') or public.has_admin_permission('directories.manage'))
with check (public.has_admin_permission('profiles.create') or public.has_admin_permission('directories.manage'));
grant select on public.managed_people to anon,authenticated;
grant insert,update,delete on public.managed_people to authenticated;

create or replace view public.public_managed_veterinarians with (security_barrier=true) as
select id::text as user_id, full_name, qualifications, specialization, years_experience, city,
       services, true as profile_verified, true as pvmc_verified, image_url,
       veterinary_sector, province, district, tehsil, public_phone, contact_email, address, google_maps_url
from public.managed_people
where profile_kind='veterinarian' and is_published and verification_status='approved' and pvmc_verification_status='approved';

create or replace view public.public_managed_professionals with (security_barrier=true) as
select id::text as user_id, slug, full_name,
       coalesce(professional_type,'Animal Health Professional') as professional_type,
       headline,current_position,organization_name,city,province,district,tehsil,public_summary,
       years_experience,skills,image_url,true as profile_verified,public_phone,contact_email,address,google_maps_url
from public.managed_people
where is_published and verification_status='approved';

grant select on public.public_managed_veterinarians, public.public_managed_professionals to anon,authenticated;

-- Enrich account-backed public directory views while preserving their original leading columns.
create or replace view public.public_veterinarians with (security_barrier=true) as
select v.user_id,p.full_name,v.qualifications,v.specialization,v.years_experience,coalesce(v.city,p.city) as city,v.services,true as profile_verified,true as pvmc_verified,v.image_url,
       v.veterinary_sector,coalesce(v.province,p.province) as province,coalesce(v.district,p.district) as district,coalesce(v.tehsil,p.tehsil) as tehsil,
       p.phone as public_phone,p.email as contact_email,null::text as address,null::text as google_maps_url
from public.veterinarian_profiles v join public.profiles p on p.id=v.user_id
where p.account_status='active' and v.verification_status='approved' and v.pvmc_verification_status='approved';

create or replace view public.public_professionals with (security_barrier=true) as
select pp.user_id,pp.slug,p.full_name,pp.professional_type,pp.headline,pp.current_position,pp.organization_name,coalesce(pp.city,p.city) as city,pp.province,pp.years_experience,pp.skills,true as profile_verified,pp.image_url,
       pp.public_summary,pp.district,pp.tehsil,
       p.phone as public_phone,p.email as contact_email,null::text as address,null::text as google_maps_url
from public.professional_profiles pp join public.profiles p on p.id=pp.user_id
where p.account_status='active' and pp.verification_status='approved' and pp.profile_visibility='public';

grant select on public.public_veterinarians, public.public_professionals to anon,authenticated;

-- =========================================================
-- 4. Canonical company/facility records that do not require a client login
-- =========================================================
alter table public.companies
  add column if not exists business_type text,
  add column if not exists description text,
  add column if not exists province text,
  add column if not exists district text,
  add column if not exists tehsil text,
  add column if not exists city text,
  add column if not exists address text,
  add column if not exists public_phone text,
  add column if not exists public_email text,
  add column if not exists website text,
  add column if not exists google_maps_url text,
  add column if not exists logo_url text,
  add column if not exists is_published boolean not null default false;

-- Backfill canonical company display names and public fields from legacy profiles.
update public.companies c set
  canonical_name = case
    when c.canonical_name ~ '^[0-9-]+$' and cp.company_name is not null then cp.company_name
    else c.canonical_name end,
  business_type = coalesce(c.business_type,cp.business_type),
  description = coalesce(c.description,cp.description),
  city = coalesce(c.city,cp.city),
  address = coalesce(c.address,cp.address),
  public_email = coalesce(c.public_email,cp.contact_email),
  website = coalesce(c.website,cp.website),
  logo_url = coalesce(c.logo_url,cp.logo_url),
  is_published = case when cp.verification_status='approved' then true else c.is_published end
from public.company_profiles cp
where c.legacy_company_user_id=cp.user_id;

create or replace view public.public_company_directory with (security_barrier=true) as
select c.id, c.legacy_company_user_id as user_id, c.canonical_name as company_name,
       c.legal_name,c.trade_name,c.business_type,c.description,c.province,c.district,c.tehsil,c.city,
       c.address,c.public_phone,c.public_email as contact_email,c.website,c.google_maps_url,c.logo_url
from public.companies c
where c.record_status='active' and c.verification_status='approved' and c.is_published;
grant select on public.public_company_directory to anon,authenticated;

-- Clinics/laboratories created by staff do not need an artificial owner account.
alter table public.clinics alter column owner_id drop not null;
alter table public.clinics
  add column if not exists tehsil text,
  add column if not exists google_maps_url text,
  add column if not exists created_by uuid references public.profiles(id) on delete set null;

alter table public.laboratories alter column owner_id drop not null;
alter table public.laboratories
  add column if not exists tehsil text,
  add column if not exists google_maps_url text,
  add column if not exists created_by uuid references public.profiles(id) on delete set null;

-- Public views append structured location/media columns used by the new frontend.
create or replace view public.public_clinics with (security_barrier=true) as
select id,slug,clinic_name,facility_type,description,city,province,address,public_phone,public_email,website,
       working_hours,emergency_service,services,species,true as profile_verified,
       district,tehsil,logo_url,cover_image_url,google_maps_url
from public.clinics where verification_status='approved' and is_published;

create or replace view public.public_laboratories with (security_barrier=true) as
select id,slug,laboratory_name,laboratory_type,description,city,province,address,public_phone,public_email,website,
       working_hours,emergency_service,species_served,tests_offered,true as profile_verified,
       accreditation_verification_status='approved' as accreditation_verified,
       district,tehsil,google_maps_url
from public.laboratories where verification_status='approved' and is_published;

grant select on public.public_clinics, public.public_laboratories to anon,authenticated;

-- =========================================================
-- 5. Clinic appointment requests and laboratory test enquiries
-- =========================================================
create table if not exists public.clinic_appointment_requests (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  requester_id uuid references public.profiles(id) on delete set null,
  contact_name text not null,
  contact_email text,
  contact_phone text,
  animal_species text,
  preferred_date date,
  preferred_time text,
  reason text not null,
  status text not null default 'new' check (status in ('new','contacted','scheduled','completed','declined','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists clinic_appointment_clinic_idx on public.clinic_appointment_requests(clinic_id,created_at desc);
alter table public.clinic_appointment_requests enable row level security;
drop policy if exists "clinic_appointment_create" on public.clinic_appointment_requests;
create policy "clinic_appointment_create" on public.clinic_appointment_requests for insert to anon,authenticated with check (true);
drop policy if exists "clinic_appointment_manage" on public.clinic_appointment_requests;
create policy "clinic_appointment_manage" on public.clinic_appointment_requests for select to authenticated
using (requester_id=(select auth.uid()) or exists(select 1 from public.clinics c where c.id=clinic_id and c.owner_id=(select auth.uid())) or public.has_admin_permission('clinics.manage'));
drop policy if exists "clinic_appointment_update" on public.clinic_appointment_requests;
create policy "clinic_appointment_update" on public.clinic_appointment_requests for update to authenticated
using (exists(select 1 from public.clinics c where c.id=clinic_id and c.owner_id=(select auth.uid())) or public.has_admin_permission('clinics.manage'));
grant select,insert,update on public.clinic_appointment_requests to anon,authenticated;

create table if not exists public.laboratory_information_requests (
  id uuid primary key default gen_random_uuid(),
  laboratory_id uuid not null references public.laboratories(id) on delete cascade,
  requester_id uuid references public.profiles(id) on delete set null,
  contact_name text not null,
  contact_email text,
  contact_phone text,
  organization text,
  test_requested text,
  sample_type text,
  message text not null,
  status text not null default 'new' check (status in ('new','reviewing','responded','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists laboratory_request_lab_idx on public.laboratory_information_requests(laboratory_id,created_at desc);
alter table public.laboratory_information_requests enable row level security;
drop policy if exists "laboratory_request_create" on public.laboratory_information_requests;
create policy "laboratory_request_create" on public.laboratory_information_requests for insert to anon,authenticated with check (true);
drop policy if exists "laboratory_request_manage" on public.laboratory_information_requests;
create policy "laboratory_request_manage" on public.laboratory_information_requests for select to authenticated
using (requester_id=(select auth.uid()) or exists(select 1 from public.laboratories l where l.id=laboratory_id and l.owner_id=(select auth.uid())) or public.has_admin_permission('laboratories.manage'));
drop policy if exists "laboratory_request_update" on public.laboratory_information_requests;
create policy "laboratory_request_update" on public.laboratory_information_requests for update to authenticated
using (exists(select 1 from public.laboratories l where l.id=laboratory_id and l.owner_id=(select auth.uid())) or public.has_admin_permission('laboratories.manage'));
grant select,insert,update on public.laboratory_information_requests to anon,authenticated;

-- =========================================================
-- 6. Structured products and jobs with canonical company linkage
-- =========================================================
alter table public.products alter column company_user_id drop not null;
alter table public.products
  add column if not exists company_id uuid references public.companies(id) on delete set null,
  add column if not exists presentation text,
  add column if not exists packaging_type text,
  add column if not exists pack_size_value text,
  add column if not exists pack_size_unit text,
  add column if not exists vaccine_type text,
  add column if not exists concentration_value text,
  add column if not exists concentration_unit text,
  add column if not exists administration_route text;
create index if not exists products_company_canonical_idx on public.products(company_id);

update public.products p set company_id=c.id
from public.companies c where p.company_id is null and c.legacy_company_user_id=p.company_user_id;

alter table public.jobs alter column company_user_id drop not null;
alter table public.jobs
  add column if not exists company_id uuid references public.companies(id) on delete set null,
  add column if not exists district text,
  add column if not exists tehsil text,
  add column if not exists address text;
create index if not exists jobs_company_canonical_idx on public.jobs(company_id);
update public.jobs j set company_id=c.id
from public.companies c where j.company_id is null and c.legacy_company_user_id=j.company_user_id;


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

-- =========================================================
-- 7. Audit-friendly updated_at triggers
-- =========================================================
do $$ begin
  if exists(select 1 from pg_proc where proname='set_updated_at' and pronamespace='public'::regnamespace) then
    drop trigger if exists admin_user_permissions_set_updated_at on public.admin_user_permissions;
    create trigger admin_user_permissions_set_updated_at before update on public.admin_user_permissions for each row execute procedure public.set_updated_at();
    drop trigger if exists master_data_items_set_updated_at on public.master_data_items;
    create trigger master_data_items_set_updated_at before update on public.master_data_items for each row execute procedure public.set_updated_at();
    drop trigger if exists managed_people_set_updated_at on public.managed_people;
    create trigger managed_people_set_updated_at before update on public.managed_people for each row execute procedure public.set_updated_at();
    drop trigger if exists clinic_appointment_requests_set_updated_at on public.clinic_appointment_requests;
    create trigger clinic_appointment_requests_set_updated_at before update on public.clinic_appointment_requests for each row execute procedure public.set_updated_at();
    drop trigger if exists laboratory_information_requests_set_updated_at on public.laboratory_information_requests;
    create trigger laboratory_information_requests_set_updated_at before update on public.laboratory_information_requests for each row execute procedure public.set_updated_at();
  end if;
end $$;

commit;
