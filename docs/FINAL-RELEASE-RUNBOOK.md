# VetConnect consolidated release runbook

## Gate 0 — freeze

- Keep the current live site unchanged while testing.
- Record the GitHub `main` commit SHA and current successful Vercel production deployment.
- Identify the Vercel project that actually owns `www.vetconnect.com.pk`.
- Record Production/Preview environment-variable names, never secret values.

## Gate 1 — database discovery

Run:

`supabase/preflight/20260824_read_only_preflight.sql`

Save the output. The preflight determines which Phase 1–4 database objects already exist. Do not infer migration state only from the Supabase dashboard label.

If a restorable Supabase backup is not available on the current plan, create a logical export before schema work and separately protect Storage objects.

## Gate 2 — source branch

Create:

`vetconnect-consolidated-rc`

Copy this package into that branch. Do not commit ZIP files or secrets.

Run locally with Node 22+:

```bash
npm ci
npm run audit
npm run lint
npm test
npm run typecheck
npm run build
npm run release:gate
```

## Gate 3 — migrations

Apply migrations only after the preflight establishes what is missing.

Canonical order in this package:

1. `202608090001_backend_phase1.sql`
2. `202608090002_backend_phase2.sql`
3. `202608110001_phase3_roles.sql`
4. `202608110002_phase3_foundation.sql`
5. `202608110003_phase3_master_data.sql`
6. `202608110004_phase3_permissions.sql`
7. `202608110005_phase3_privacy_cutover.sql` **only at the coordinated cutover point described in the Phase 3 release notes**
8. `202608170001_phase4_admin_control.sql`

Do not apply migration 005 early. It deliberately removes legacy anonymous policies and is intended for the coordinated frontend/privacy cutover.

After the intended migration set, run:

`supabase/preflight/20260824_post_migration_validation.sql`

## Gate 4 — Preview

Push the branch and use Vercel Preview. Do not merge to `main` yet.

Test at minimum:

- `/`
- `/vets` and a detail page
- `/professionals` and a detail page
- `/clinics` and a detail page
- `/labs` and a detail page
- `/companies` and a detail page
- `/marketplace` and a product detail page
- `/jobs` and a job detail page
- `/login`, `/register`, `/verify-email`
- `/dashboard`, `/dashboard/company`
- `/admin`, `/admin/reviews`, `/admin/products`, `/admin/users`, `/admin/audit`
- `/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest`

## Gate 5 — role tests

Use separate test accounts for Super Administrator, Verification Officer, Content Admin, Careers Admin, Analyst and Company user. Test direct URLs and crafted actions, not only visible buttons.

## Gate 6 — editorial acceptance

The owner/editor signs off public text, verification claims, regulatory wording, images, metadata, responsive presentation and sample/demo handling.

## Gate 7 — production

Only after all gates pass:

1. confirm backup/export again;
2. merge the protected branch to `main`;
3. verify the correct Vercel project receives the production build;
4. smoke-test public and protected routes;
5. apply the privacy cutover only at the documented safe point if it has not already been applied;
6. monitor Vercel/Supabase errors and user reports;
7. retain the prior database-compatible Vercel deployment for rollback.
