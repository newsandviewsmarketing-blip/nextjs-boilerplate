# VetConnect Phase 4 Setup

Use the existing Supabase project, Vercel project and `www.vetconnect.com.pk` domain. Do not create a second production database or change DNS.

## 1. Confirm the Phase 3 baseline

Before Phase 4, confirm the existing production database contains the Phase 1, Phase 2 and Phase 3 tables and functions. Keep a current Supabase backup, the current production source reference and the current Vercel deployment reference.

If the Phase 3 privacy cutover has not yet been completed, finish the coordinated Phase 3 release sequence first. Do not apply migrations out of filename order.

## 2. Create a controlled source branch

Create `vetconnect-phase-4` from the current production branch and copy this package into it. Do not commit `.env.local`, `.next`, `node_modules`, `.vercel`, service-role keys or ZIP files.

## 3. Apply the Phase 4 database migration

In the existing Supabase SQL Editor, run this complete file once:

`supabase/migrations/202608170001_phase4_admin_control.sql`

The migration:

- adds publication, archive and editor tracking fields to products
- creates the administrator hierarchy catalogue
- narrows legacy broad administrator access to `super_admin`
- gives verification, content, careers and analyst roles only their assigned permissions
- restricts user role and account-status management to Super Administrators
- adds recoverable product archiving and safe staff audit visibility

Do not disable Row Level Security.

## 4. Confirm the database objects

Confirm `admin_role_permissions` exists and contains five rows: Super Administrator, Verification Officer, Marketplace & Content Admin, Careers Admin and Read-only Analyst.

Confirm `products` contains `published_at`, `published_by`, `archived_at`, `archived_by` and `last_edited_by`.

Confirm these functions are available:

- `is_super_admin`
- `has_admin_permission`
- `can_manage_jobs`

## 5. Bootstrap or confirm the first Super Administrator

Keep at least one trusted `super_admin` in `user_roles`. The Phase 4 interface prevents the last Super Administrator from removing that role and prevents an administrator from suspending their own account.

New staff first register through the normal verified-email flow. A Super Administrator then opens `/admin/users` and assigns one or more staff roles.

## 6. Keep the existing environment variables

Production, Preview and Development must retain:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SITE_URL=https://www.vetconnect.com.pk`

Never expose a Supabase service-role key to the browser or commit it to source.

## 7. Verify locally and deploy Preview

Use Node.js 22 or later:

```bash
npm ci
npm run check
npm run security:audit
```

Deploy the `vetconnect-phase-4` branch to the existing Vercel Preview environment.

## 8. Test separate staff accounts

Use a separate account for every role:

- Super Administrator: users, roles, products, reviews and audit
- Verification Officer: profiles, PVMC credentials and regulatory evidence only
- Content Admin: products and jobs, without user-role or private regulatory access
- Careers Admin: job moderation only
- Analyst: read-only overview and audit
- Company: own products only, with approved edits returned to review

Test direct URLs as well as visible buttons. A hidden menu item is not a security boundary.

## 9. Product lifecycle test

1. Create an unpublished product for an approved company.
2. Edit its structured fields.
3. Approve and publish it.
4. Confirm it appears in `/marketplace`.
5. Unpublish it and confirm it disappears publicly.
6. Archive and restore it.
7. Edit an approved product from the company workspace and confirm it returns to review.
8. Test permanent deletion only with a Super Administrator and only on a disposable record.

## 10. Production promotion

Merge only after the Preview checklist, role-by-role RLS checks, mobile review and production build all pass. Keep the previous deployment and database backup available until the production smoke test is complete.
