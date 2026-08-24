# VetConnect Phase 3 Setup

Follow this order. Do not change DNS and do not create a second production project.

## 1. Take backups

Before applying Phase 3, keep separate copies of:

- latest GitHub `main` source
- current Supabase database backup or schema/data export
- current Vercel environment-variable list, without sharing secret values
- current production deployment reference

## 2. Create a controlled branch

Create a branch named `vetconnect-phase-3`. Copy the contents of this package into that branch. Do not upload this ZIP, `node_modules`, `.next`, `.vercel` or `.env.local`.

## 3. Run the database migrations

In the existing VetConnect Supabase project, open **SQL Editor** and run one complete file at a time.

If Phase 1 and Phase 2 are already present, begin with Phase 3:

1. `supabase/migrations/202608110001_phase3_roles.sql`
2. Wait for a successful result.
3. `supabase/migrations/202608110002_phase3_foundation.sql`
4. `supabase/migrations/202608110003_phase3_master_data.sql`
5. `supabase/migrations/202608110004_phase3_permissions.sql`

Do not combine the role migration with the foundation migration in one query.

Do **not** run `202608110005_phase3_privacy_cutover.sql` yet. That final migration removes legacy anonymous reads used by the previous frontend. It is intentionally held until the new frontend is live and verified, so the previous Vercel deployment remains a working rollback during rollout.

## 4. Confirm the new database objects

In Supabase Table Editor, confirm the main new tables exist:

- `professional_profiles`
- `professional_credentials`
- `clinics`
- `laboratories`
- `laboratory_tests`
- `company_roles`
- `company_sectors`
- `company_locations`
- `company_contacts`
- `product_regulatory`
- `product_company_relationships`
- `jobs`
- `job_applications`
- `connection_requests`
- `verification_records`
- `export_logs`

Also confirm these public views exist:

- `public_veterinarians`
- `public_companies`
- `public_professionals`
- `public_clinics`
- `public_laboratories`
- `public_jobs`

Do not disable Row Level Security.

## 5. Keep existing environment variables

Confirm the existing Vercel project has these values for Production, Preview and Development:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SITE_URL=https://www.vetconnect.com.pk`

Do not add a Supabase service-role key to browser variables or source code.

## 6. Deploy Preview

Push the `vetconnect-phase-3` branch and wait for the Vercel Preview deployment. Do not merge to `main` yet.

Before testing, run the local verification gate:

```bash
npm ci
npm run check
npm run security:audit
```

## 7. Test accounts and roles

Use separate test accounts for:

- veterinarian
- company
- candidate
- professional
- laboratory
- unrelated normal user
- trusted administrator

Confirm that one account cannot read another account's private PVMC number, registration number, contact information, CV, evidence path or reviewer notes.

## 8. Test the Phase 3 sequence

### Veterinarian

1. Register and verify email OTP.
2. Complete the veterinarian profile.
3. Approve the profile from `/admin`.
4. Separately verify the PVMC credential.
5. Confirm the profile appears in `/vets` without displaying the PVMC number.

### Company and product

1. Approve the company profile.
2. Save more than one company role and sector.
3. Submit a multi-sector/species product.
4. Approve the product profile.
5. Review the regulatory record separately.
6. Confirm the public product uses the correct badge wording.

### Laboratory and professional

1. Register each account type.
2. Complete its profile.
3. Approve the record with an authorized administrator.
4. Confirm only approved public fields appear in the directory.

### Jobs

1. Post a job from an approved company.
2. Approve it in `/admin`.
3. Apply from a candidate or professional account.
4. Confirm duplicate applications are blocked.

## 9. Test device layouts

Test the Vercel Preview on at least:

- 360px and 390px mobile widths
- 768px tablet width
- 1366px laptop width
- a current Chrome, Safari and Firefox browser where available

Confirm the Menu button opens every primary route, Escape closes it, profile photographs retain their original proportions through a square crop, and no card or form causes horizontal scrolling.

## 10. Merge only after approval

Merge to `main` only after the production build and the complete Preview checklist pass. The existing VetConnect production domain should then receive the deployment through the current Vercel project.

Keep the previous production deployment reference available until the new frontend passes the production smoke test.

## 11. Apply the privacy cutover last

After the new frontend is live on `www.vetconnect.com.pk`, verify `/vets`, `/companies`, `/professionals`, login and the main navigation. Then run:

1. `supabase/migrations/202608110005_phase3_privacy_cutover.sql`
2. Recheck the public directories as an anonymous visitor.
3. Confirm that `pvmc_number`, registration numbers and private contact fields do not appear in browser responses or page source.

Do not roll the frontend back to a pre-Phase-3 build after this privacy cutover. If rollback becomes necessary, stop and restore the coordinated database access plan first.

The complete sign-off list is in `docs/PHASE3-RELEASE-CHECKLIST.md`.
