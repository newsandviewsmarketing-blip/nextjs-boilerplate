# VetConnect Preview Deployment Checklist — 30 August 2026

## Before database changes

- Confirm the target Supabase project is the VetConnect production/staging project intended for this deployment.
- Export or confirm a recent database backup/snapshot if available under the current plan.
- Check whether the columns/buckets introduced by the two 30 August migrations already exist.
- Do not rerun historical migrations only to populate the Supabase dashboard migration-history tile.

## Apply database changes

Run in this order only when missing:

1. `202608300001_profile_standardization.sql`
2. `202608300002_workspaces_and_media.sql`

Expected additions include standardized geography fields, veterinarian sector, credential visibility, clinic media fields, Storage buckets/policies, privacy-safe public profile/clinic view extensions and public normalized clinic-service read access.

## Preview QA

- Veterinarian profile: save sector, specialization, services and standardized location.
- Professional workspace: photo, headline/about, experience, education, credential and CV document.
- Public professional profile: confirm only approved/public records appear.
- Career: save a job, submit/track application, view saved jobs and any existing calculated matches.
- Clinic: create/edit facility, upload logo/cover, manage normalized services and request affiliation from a second professional account.
- Public clinic: verify approved/published facility media and public services.
- Admin users: search/filter the directory and download CSV.
- Admin home: verify queue counts, 24-hour operational pulse and latest recorded actions.
- Existing company/product/job workflows: regression test before merge.

## Release gate

Do not merge the preview branch to `main` until the Vercel preview build passes and the above workflows are verified against the correct Supabase environment.
