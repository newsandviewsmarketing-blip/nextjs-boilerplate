# VetConnect Pakistan — Phase 4 Admin Control

Vercel-ready Next.js source for the upgraded VetConnect platform. Phase 4 preserves the Phase 3 public directories, Supabase authentication, database records and orange/navy identity, then adds a permission-based administration hierarchy, complete product lifecycle management, multi-role staff access, recoverable archiving and operational audit visibility.

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

1. Create the `vetconnect-phase-4` branch from the current production source.
2. Confirm all Phase 1 to Phase 3 migrations already applied successfully.
3. Apply `202608170001_phase4_admin_control.sql` before deploying the Phase 4 frontend.
4. Keep the existing Supabase project, Vercel project, email OTP setup and domain.
5. Deploy a Vercel Preview and test every staff role with a separate account.
6. Merge to `main` only after the complete acceptance checklist passes.

Detailed instructions: `docs/PHASE4-SETUP.md`, `docs/PHASE4-IMPLEMENTATION-AUDIT.md` and `docs/PHASE4-RELEASE-CHECKLIST.md`. Phase 3 documents remain included as migration history.

Never commit an email password, Supabase service-role key, `.env.local`, `.next`, `node_modules` or a project ZIP.
