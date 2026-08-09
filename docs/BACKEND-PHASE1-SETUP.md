# VetConnect Backend Phase 1 Setup

This package adds Supabase PostgreSQL, email/password authentication, account roles, protected dashboards, profile management and veterinarian/company approval.

## 1. Create the Supabase project

Create one Supabase project for VetConnect. Keep all roles and modules in this single project.

## 2. Run the database migration

Open Supabase **SQL Editor**, create a new query, paste the complete contents of:

`supabase/migrations/202608090001_backend_phase1.sql`

Run it once. The migration creates tables, triggers, role checks, audit logs and Row Level Security policies.

## 3. Configure authentication URLs

In Supabase Authentication URL Configuration set:

- Site URL: `https://www.vetconnect.com.pk`
- Redirect URL: `https://www.vetconnect.com.pk/auth/confirm`
- Local redirect URL: `http://localhost:3000/auth/confirm`

Keep email confirmation enabled for production.

## 4. Add Vercel environment variables

In the existing Vercel `vetconnect` project add these variables for Production, Preview and Development:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SITE_URL=https://www.vetconnect.com.pk`

Use the Project URL and publishable key from the Supabase **Connect** dialog. Never upload `.env.local` to GitHub.

## 5. Create the first administrator

Register the trusted administrator through `/register` and confirm the email. Then run the two administrator statements at the bottom of the migration file, replacing `admin@example.com` with the real administrator email.

## 6. Deploy

Commit the files to a new Git branch, create a pull request and wait for Vercel checks. Test registration, email confirmation, login, profile saving, admin approval and logout in Preview before merging to `main`.

## Included roles

- `super_admin`
- `career_admin`
- `veterinarian`
- `company`
- `candidate`
- `user`

The `user_roles` table permits multiple roles per account. Public registration assigns one safe initial role. Administrator roles cannot be self-selected.

## Email OTP later

Email OTP is intentionally not enabled in Phase 1. The current Supabase project and SSR session setup can support it later without creating a second account system.
