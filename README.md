# VetConnect Pakistan Backend Phase 2

Audited, Vercel-ready Next.js source for VetConnect Pakistan with Supabase email OTP, roles, company and veterinarian approval, company product management, administrator product approval, public company/product pages, saved products and customer information or quotation requests.

## Working routes

- `/login` and `/verify-email` — passwordless email OTP
- `/register` — role-based registration with email verification
- `/dashboard` — protected account and professional/company profile
- `/dashboard/company` — protected company product and inquiry workspace
- `/admin` — protected profile and product moderation
- `/companies` and `/companies/[id]` — approved public company directory
- `/marketplace` and `/marketplace/[slug]` — approved product search and details
- `/vets`, `/jobs`, `/learn` — existing public modules

## Phase 2 boundary

Products are informational. This package does not process payments, checkout, medicine orders, paid bookings, wallets or subscriptions. Appointment booking, job applications and course delivery remain later modules.

Private regulatory product data is kept in `product_compliance`, protected by Row Level Security and visible only to the submitting company and administrators.

## Local verification

```bash
npm install
npm run audit
npm run build
npm run dev
```

## Deployment

1. Run the Phase 2 migration after the existing Phase 1 migration.
2. Configure the Supabase email OTP template and custom SMTP.
3. Confirm the three Vercel public environment variables.
4. Upload the extracted source files to a new Git branch and test its Vercel Preview.
5. Merge to `main` only after OTP, approval and marketplace tests pass.

Detailed instructions: `docs/BACKEND-PHASE2-SETUP.md` and `docs/VERCEL-DEPLOYMENT.md`.

Never commit a Gmail App Password, Supabase service-role key, `.env.local`, `.next`, `node_modules` or the ZIP itself.
