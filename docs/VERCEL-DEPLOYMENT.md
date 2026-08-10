# Deploy VetConnect Backend Phase 2 to the Existing Vercel Project

Use the existing GitHub repository, existing Vercel `vetconnect` project and existing `www.vetconnect.com.pk` domain. Do not create a second production project or change the domain DNS.

## 1. Prepare Supabase first

Follow `docs/BACKEND-PHASE2-SETUP.md`. Use the existing Supabase project, run the Phase 2 migration, configure the OTP email template and custom SMTP.

## 2. Add Vercel environment variables

In the existing Vercel `vetconnect` project, add these variables to Production, Preview and Development:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SITE_URL=https://www.vetconnect.com.pk`

Do not add a service-role key and do not upload `.env.local` to GitHub.

## 3. Upload with GitHub Desktop

1. In GitHub Desktop, fetch the latest `main` branch.
2. Create a new branch named `backend-phase-2`.
3. Extract this source ZIP.
4. Copy the files and folders inside the extracted project into the local repository folder. Do not copy the ZIP itself or any `.vercel`, `.next` or `node_modules` folder.
5. In GitHub Desktop, confirm the new backend, `lib` and `supabase` files appear in Changes.
6. Use the summary `Add VetConnect Backend Phase 2`.
7. Commit to `backend-phase-2` and push the branch.

Vercel will create a Preview deployment from the branch.

## 4. Test Preview before production

Test this sequence:

1. Register a new account and verify the emailed OTP.
2. Sign out and sign back in with a fresh OTP.
3. Approve a company profile from `/admin`.
4. Submit a product from `/dashboard/company`.
5. Approve the product and confirm it becomes public.
6. Send an information request from a separate account.
7. Confirm the company receives and can update the request.

Only merge the pull request into `main` after the Preview deployment is green and the above tests pass. The existing domain will then receive the new production deployment automatically.

## Build settings

- Framework Preset: Next.js
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: leave blank
- Node.js: use a currently supported Vercel version satisfying `>=22.13.0`
