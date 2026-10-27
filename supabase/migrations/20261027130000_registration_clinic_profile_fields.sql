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
