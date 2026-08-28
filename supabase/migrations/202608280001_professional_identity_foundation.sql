begin;

-- =========================================================
-- VetConnect Professional Identity Foundation
-- Every veterinarian is also a professional, while not every
-- professional is a veterinarian.
-- Existing veterinarian/PVMC records remain unchanged.
-- =========================================================

create or replace function public.ensure_professional_profile_for_veterinarian()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.professional_profiles (
    user_id,
    slug,
    professional_type,
    headline,
    public_summary,
    city,
    province,
    years_experience,
    image_url,
    verification_status,
    verified_at,
    verified_by
  )
  values (
    new.user_id,
    'vet-' || replace(new.user_id::text, '-', ''),
    'Veterinarian',
    coalesce(nullif(new.specialization, ''), 'Veterinarian'),
    new.public_summary,
    new.city,
    new.province,
    new.years_experience,
    new.image_url,
    new.verification_status,
    new.verified_at,
    new.verified_by
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists
  zz_vet_profiles_ensure_professional_profile
on public.veterinarian_profiles;

create trigger zz_vet_profiles_ensure_professional_profile
after insert on public.veterinarian_profiles
for each row
execute function public.ensure_professional_profile_for_veterinarian();


-- Backfill existing veterinarians that do not yet have
-- a professional/CV profile.

insert into public.professional_profiles (
  user_id,
  slug,
  professional_type,
  headline,
  public_summary,
  city,
  province,
  years_experience,
  image_url,
  verification_status,
  verified_at,
  verified_by
)
select
  vp.user_id,
  'vet-' || replace(vp.user_id::text, '-', ''),
  'Veterinarian',
  coalesce(nullif(vp.specialization, ''), 'Veterinarian'),
  vp.public_summary,
  vp.city,
  vp.province,
  vp.years_experience,
  vp.image_url,
  vp.verification_status,
  vp.verified_at,
  vp.verified_by
from public.veterinarian_profiles vp
left join public.professional_profiles pp
  on pp.user_id = vp.user_id
where pp.user_id is null
on conflict (user_id) do nothing;

commit;
