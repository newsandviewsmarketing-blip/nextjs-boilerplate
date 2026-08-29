begin;

-- VetConnect profile standardization
-- Canonical geography is stored as province -> district -> tehsil/taluka.
-- The legacy city column remains populated for backward compatibility.

alter table public.profiles
  add column if not exists province text,
  add column if not exists district text,
  add column if not exists tehsil text;

alter table public.veterinarian_profiles
  add column if not exists veterinary_sector text,
  add column if not exists province text,
  add column if not exists district text,
  add column if not exists tehsil text;

alter table public.professional_profiles
  add column if not exists tehsil text;

alter table public.company_profiles
  add column if not exists province text,
  add column if not exists district text,
  add column if not exists tehsil text;

alter table public.laboratories
  add column if not exists tehsil text;

alter table public.laboratory_locations
  add column if not exists tehsil text;

alter table public.clinics
  add column if not exists tehsil text;

create index if not exists profiles_location_idx
  on public.profiles(province, district, tehsil);

create index if not exists veterinarian_sector_location_idx
  on public.veterinarian_profiles(veterinary_sector, province, district, tehsil);

create index if not exists professional_location_idx
  on public.professional_profiles(province, district, tehsil);

create index if not exists company_profile_location_idx
  on public.company_profiles(province, district, tehsil);

create index if not exists laboratory_location_idx
  on public.laboratories(province, district, tehsil);

create index if not exists laboratory_branch_location_idx
  on public.laboratory_locations(province, district, tehsil);

create index if not exists clinic_location_idx
  on public.clinics(province, district, tehsil);

commit;
