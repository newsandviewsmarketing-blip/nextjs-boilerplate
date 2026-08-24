# VetConnect Pakistan — Consolidated Release Candidate 2026-08-24

Release-candidate Next.js source for VetConnect Pakistan. It preserves the corrected Phase 3 public-directory and database work, includes the Phase 4 permission-based administration hierarchy and controlled product lifecycle, and adds deployment-state documentation, read-only database preflight checks, SEO/indexing foundations, image accessibility improvements and a SHA-256 release manifest. The visual identity and supplied public assets are preserved.

## Public modules

- `/vets` and `/vets/[id]` — verified veterinarians, with PVMC credential review kept distinct from VetConnect profile review
- `/professionals` and `/professionals/[slug]` — animal-health professionals who are not presented as veterinarians
- `/clinics` and `/clinics/[slug]` — approved clinics and hospitals
- `/labs` and `/labs/[slug]` — approved diagnostic laboratories
- `/companies` and `/companies/[id]` — approved multi-role, multi-sector company profiles
- `/marketplace` and `/marketplace/[slug]` — approved, classified product information
- `/jobs` and `/jobs/[slug]` — moderated veterinary and animal-health opportunities
- `/learn` and `/vnv-news` — education and news

## Protected workspaces

- `/login`, `/verify-email` and `/register` — passwordless email OTP and role-based registration
- `/dashboard` — private account, veterinarian, professional, laboratory and company profile management
- `/dashboard/company` — products, regulatory submissions and structured job posts
- `/dashboard/company/products/[id]` — company-side product editing and resubmission
- `/admin` — role-aware operations overview
- `/admin/reviews` — credential, profile, regulatory, product and job review queues
- `/admin/products` — add, edit, publish, unpublish, archive, restore and remove products
- `/admin/users` — Super Administrator account status and multi-role assignment
- `/admin/audit` — Super Administrator and Analyst activity log

## Administration hierarchy

1. `super_admin` — full platform, user, role, publishing and audit control
2. `verification_officer` — profile, PVMC credential and regulatory review
3. `content_admin` — product, marketplace and job management
4. `career_admin` — job and recruitment workflow management
5. `analyst` — read-only operational and audit access

The hierarchy is enforced both in server actions and Supabase Row Level Security. Users continue to self-register through verified email; only a Super Administrator can grant or revoke staff roles.

## Platform boundary

Marketplace records are informational profiles. This package does not process medicine sales, checkout, payments, prescriptions, paid bookings, wallets or subscriptions. Regulatory details and personal identifiers remain private unless a controlled public view explicitly exposes a safe field.

## Local verification

```bash
npm ci
npm run check
npm run security:audit
npm run dev
```

## Deployment

Start with `START-HERE.md` and `docs/FINAL-RELEASE-RUNBOOK.md`. The current screenshots do not prove which database migrations were executed manually, so run the read-only preflight before applying SQL. Use a feature branch and Vercel Preview, then merge to `main` only after database, permission, editorial, responsive and SEO acceptance checks pass.

Phase 3 and Phase 4 setup/audit documents remain included as migration and implementation history.

Never commit an email password, Supabase service-role key, `.env.local`, `.next`, `node_modules` or a project ZIP.
