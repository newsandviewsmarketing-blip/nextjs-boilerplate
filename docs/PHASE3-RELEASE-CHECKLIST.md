# VetConnect Phase 3 Release Checklist

Use this checklist with the existing Supabase project, Vercel project and `www.vetconnect.com.pk` domain. Do not create a second production database or change DNS.

## A. Backup and rollback reference

- [ ] Record the current Git commit and current Vercel production deployment.
- [ ] Take a Supabase backup or verified schema/data export.
- [ ] Export the names and scopes of current Vercel environment variables without copying secrets into source.
- [ ] Confirm the previous production deployment can be promoted before the privacy cutover.

## B. Source verification

- [ ] Use Node.js 22 or later.
- [ ] Run `npm ci`.
- [ ] Run `npm run check` and keep the successful log.
- [ ] Run `npm run security:audit` and resolve any high-severity result before Preview.
- [ ] Confirm `.env.local`, `.vercel`, `.next`, `node_modules` and ZIP files are not committed.
- [ ] Confirm `public/vetconnect-logo.png` is the approved unchanged logo.

## C. Additive database stage

- [ ] Run `202608110001_phase3_roles.sql` alone and wait for success.
- [ ] Run `202608110002_phase3_foundation.sql`.
- [ ] Run `202608110003_phase3_master_data.sql`.
- [ ] Run `202608110004_phase3_permissions.sql`.
- [ ] Do not run `202608110005_phase3_privacy_cutover.sql` yet.
- [ ] Confirm every expected table and public view in `PHASE3-SETUP.md` exists and RLS remains enabled.

## D. Vercel Preview

- [ ] Deploy the existing project from the `vetconnect-phase-3` branch.
- [ ] Confirm Preview uses the intended Supabase project and no service-role key is exposed to the browser.
- [ ] Test home, vets, companies, marketplace, jobs, clinics, labs, professionals, learn, registration, login and dashboard routes.
- [ ] Test veterinarian, company, candidate, professional, laboratory, unrelated-user and admin accounts.
- [ ] Confirm private PVMC numbers, registration numbers, evidence paths, CVs, reviewer notes and private contacts cannot be read by an anonymous or unrelated account.

## E. Responsive and image review

| View | Required checks |
|---|---|
| 360px and 390px mobile | Logo, Join button and Menu fit; menu opens all routes; no horizontal scroll |
| 768px tablet | Menu is available; forms, cards and filters remain usable |
| 1366px laptop | Full navigation, directories and dashboards align correctly |
| Chrome, Safari, Firefox | Login, filters, menu keyboard access and forms behave consistently |

- [ ] Press Escape while the mobile menu is open and confirm it closes.
- [ ] Check approved veterinarian and professional photos on list and detail pages.
- [ ] Confirm the stored image files and URLs were not transformed or replaced. Only the display frame uses `object-fit: cover`.
- [ ] Confirm missing photos use initials and do not leave broken-image icons.

## F. Production promotion

- [ ] Obtain human approval for Preview.
- [ ] Merge the approved branch to `main` in the existing repository.
- [ ] Confirm the existing Vercel project deploys the same tested commit.
- [ ] Smoke-test `/`, `/vets`, `/companies`, `/professionals`, `/login` and `/dashboard` on the production domain.
- [ ] Keep the previous production deployment reference until the smoke test passes.

## G. Final privacy cutover

- [ ] Run `202608110005_phase3_privacy_cutover.sql` only after the new frontend is live.
- [ ] Recheck public directories in a signed-out private browser window.
- [ ] Inspect responses/page source for `pvmc_number`, company registration numbers and private contacts.
- [ ] Repeat one owner, unrelated-user and admin RLS test.
- [ ] Record the migration result, production deployment ID and sign-off time.

After the final privacy cutover, do not promote a pre-Phase-3 frontend without a coordinated database rollback plan.
