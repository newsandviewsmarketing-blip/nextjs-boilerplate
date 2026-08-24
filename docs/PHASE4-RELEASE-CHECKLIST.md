# VetConnect Phase 4 Release Checklist

## A. Backup and source

- [ ] Record the current production source and deployment.
- [ ] Take a current Supabase backup or verified export.
- [ ] Create `vetconnect-phase-4` from the current production branch.
- [ ] Confirm no secrets, `.env.local`, `.next`, `node_modules`, `.vercel` or ZIP files are committed.

## B. Database

- [ ] Confirm all earlier migrations are already applied.
- [ ] Run `202608170001_phase4_admin_control.sql` as one complete file.
- [ ] Confirm `admin_role_permissions` contains five hierarchy rows.
- [ ] Confirm product publication and archive columns exist.
- [ ] Keep Row Level Security enabled.
- [ ] Confirm at least one trusted Super Administrator remains.

## C. Automated checks

- [ ] Use Node.js 22 or later.
- [ ] Run `npm ci`.
- [ ] Run `npm run check`.
- [ ] Run `npm run security:audit` and resolve high-severity findings.

## D. Role tests

- [ ] Super Administrator can manage users, staff roles and accounts.
- [ ] Super Administrator cannot remove their own final administrator role or suspend their own account.
- [ ] Verification Officer can review profiles, PVMC credentials and regulatory evidence only.
- [ ] Content Admin can manage products and jobs but cannot manage users or regulatory evidence.
- [ ] Careers Admin can moderate jobs but cannot manage products, users or profile verification.
- [ ] Analyst can read the overview and audit log but cannot mutate records.
- [ ] Company users can read and edit only their own products.
- [ ] Direct unauthorized URLs and crafted form submissions are rejected.

## E. Product lifecycle

- [ ] Create an unpublished product for an approved company.
- [ ] Edit all structured product fields.
- [ ] Approve and publish the product.
- [ ] Confirm the listing appears publicly.
- [ ] Unpublish and confirm it disappears publicly.
- [ ] Archive and restore the record.
- [ ] Edit an approved product from the company workspace and confirm it returns to review.
- [ ] Confirm regulatory references are private and visible only to authorized users.
- [ ] Permanently delete only a disposable test record with a Super Administrator.

## F. Interface and production

- [ ] Test 360px, 390px, 768px and 1366px widths.
- [ ] Test current Chrome, Safari and Firefox where available.
- [ ] Confirm admin navigation, forms, filters and buttons are keyboard accessible.
- [ ] Deploy the existing Vercel project from the Phase 4 branch.
- [ ] Obtain human approval for Preview.
- [ ] Merge to `main` and smoke-test `/admin`, `/admin/products`, `/admin/users`, `/dashboard/company` and `/marketplace`.
- [ ] Keep the previous deployment and database backup until sign-off.
