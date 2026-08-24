-- VetConnect Pakistan Phase 3 privacy cutover
-- Run only after the Phase 3 frontend is live and public directories have been verified.
-- Keeping this separate preserves compatibility with the previous frontend during rollback.

begin;

drop policy if exists "vets_public_approved" on public.veterinarian_profiles;
drop policy if exists "companies_public_approved" on public.company_profiles;
revoke all on public.veterinarian_profiles, public.company_profiles from anon;

commit;
