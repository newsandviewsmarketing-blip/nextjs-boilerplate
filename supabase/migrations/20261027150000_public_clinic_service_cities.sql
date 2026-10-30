-- Append an optional location field while preserving every existing public_clinics column.
create or replace view public.public_clinics
with (security_barrier=true) as
select
  id,slug,clinic_name,facility_type,description,city,province,address,
  public_phone,public_email,website,working_hours,emergency_service,services,
  species,true as profile_verified,district,tehsil,logo_url,cover_image_url,
  google_maps_url,other_cities
from public.clinics
where verification_status='approved' and is_published;

grant select on public.public_clinics to anon, authenticated;
