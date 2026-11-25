-- Account phone and email belong to the sign-in profile. Retain the view columns
-- for existing callers, while keeping designated facility and managed contacts separate.
create or replace view public.public_veterinarians with (security_barrier=true) as
select v.user_id,p.full_name,v.qualifications,v.specialization,v.years_experience,coalesce(v.city,p.city) as city,v.services,true as profile_verified,true as pvmc_verified,v.image_url,
       v.veterinary_sector,coalesce(v.province,p.province) as province,coalesce(v.district,p.district) as district,coalesce(v.tehsil,p.tehsil) as tehsil,
       null::text as public_phone,null::text as contact_email,null::text as address,null::text as google_maps_url
from public.veterinarian_profiles v join public.profiles p on p.id=v.user_id
where p.account_status='active' and v.verification_status='approved' and v.pvmc_verification_status='approved';

create or replace view public.public_professionals with (security_barrier=true) as
select pp.user_id,pp.slug,p.full_name,pp.professional_type,pp.headline,pp.current_position,pp.organization_name,coalesce(pp.city,p.city) as city,pp.province,pp.years_experience,pp.skills,true as profile_verified,pp.image_url,
       pp.public_summary,pp.district,pp.tehsil,
       null::text as public_phone,null::text as contact_email,null::text as address,null::text as google_maps_url
from public.professional_profiles pp join public.profiles p on p.id=pp.user_id
where p.account_status='active' and pp.verification_status='approved' and pp.profile_visibility='public';
