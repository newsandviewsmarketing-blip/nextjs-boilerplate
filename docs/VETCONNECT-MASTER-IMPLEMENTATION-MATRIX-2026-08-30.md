# VetConnect Pakistan — Master Implementation Matrix

Date: 30 August 2026

This document is the control sheet for the current source package. A feature is not treated as complete merely because its database table or migration exists. Each module should be tracked through database, user interface, permissions, testing and production deployment.

## Architecture baseline

- GitHub: canonical source/version history.
- Next.js: forms, public pages, user workspaces and admin dashboards.
- Supabase: PostgreSQL records, authentication, row-level security and storage.
- Vercel: preview and production deployment.
- Replit: optional development environment only; it is not part of the required production architecture.

## Batch implemented in this source package

| Module | Database | UI / workflow | Status in this package |
| --- | --- | --- | --- |
| Veterinarian profile taxonomy | Additive standardization migration | Sector → specialization; service checkboxes | Implemented, migration required |
| Pakistan location hierarchy | Additive province/district/tehsil columns | Province → district → tehsil/taluka; city/town entry | Implemented, migration required |
| Professional identity | Existing professional tables + additive visibility/media work | LinkedIn-style workspace and public profile | Implemented, migration required |
| Profile photo | Supabase Storage `profile-media` | Upload and public display | Implemented, migration required |
| Education | Existing `professional_education` | Add/remove records + public timeline | Implemented |
| Experience | Existing `professional_experience` | Add/remove records + public timeline | Implemented |
| Credentials | Existing `professional_credentials` + visibility column | Submit/remove + verified public display | Implemented, migration required |
| CV/career documents | Existing `career_documents` + private storage | Upload/remove + signed owner link | Implemented, migration required |
| Career workspace | Existing applications/matches/saved jobs | Applications, saved jobs and calculated matches | Implemented |
| Save job | Existing `saved_jobs` | Save/unsave action on job page | Implemented |
| Clinic workspace | Existing clinic and membership tables | Create/edit clinic and affiliation workflow | Implemented |
| Clinic media | Added clinic logo/cover fields + `profile-media` | Logo/cover upload and public display | Implemented, migration required |
| Clinic services | Existing normalized service catalog | Manage services, fees, duration and booking flag | Implemented |
| Admin master directory | Existing profiles/veterinarian tables | Filters, standardized columns, CSV/Excel-compatible export | Implemented |
| Admin operational pulse | Existing records/audit logs | 24-hour summary + latest eight recorded actions | Implemented |

## Modules still requiring a dedicated delivery batch

| Module | Current source position | Next required work |
| --- | --- | --- |
| Clinic appointments | No complete appointment workflow found | Appointment schema, availability/calendar, booking states, reminders and clinic controls |
| Laboratory workspace | Core laboratory/branch/test/accreditation tables exist | Dedicated owner workspace for branches, tests, accreditation evidence, media and standardized taxonomy |
| Candidate matching automation | `job_matches` table exists | Matching calculation/refresh service and administrator controls |
| Notifications | Partial platform foundations only | Notification preferences, in-app/email delivery and event triggers |
| Animal/patient records | No complete production module found | Patient/animal identity, owner/farm link, clinical history, treatment/prescription and permissions |
| Learning | Public/static learning content exists | Enrolment, course progress, certificates and content management |
| Clinic team invitations | Membership RPC foundation exists | Name/search-based invitation and professional-facing response UI |
| Media lifecycle | Upload now supported | Replace/remove old public profile/clinic images and orphan-file cleanup |
| Admin analytics | Basic counts/export implemented | Area/sector charts, trend periods and scheduled reports |

## Database change rule

Do not rerun the historical August migrations simply because the Supabase dashboard does not show a migration-history entry. This source package adds only these new files for the current batch:

1. `supabase/migrations/202608300001_profile_standardization.sql`
2. `supabase/migrations/202608300002_workspaces_and_media.sql`

Review the live schema first, then run only the missing new migrations in order on the preview/staging database before deploying the frontend preview.

## Quality status

- Source tests: 20/20 passed in the working environment.
- Structure audit: passed, 96 required entries verified.
- TypeScript/TSX syntax transpilation: passed for all changed TypeScript files.
- Full Next.js typecheck/build: not completed in the working environment because the dependency installation is incomplete. Vercel preview build/CI remains the release gate before production.

## Release workflow

1. Preserve the current production deployment and `main` branch.
2. Create a dedicated preview branch for this batch.
3. Apply only the new database migrations to the intended Supabase environment after schema review.
4. Deploy the branch to Vercel Preview.
5. Test a veterinarian account, a professional/candidate account, a clinic owner/affiliate flow, company/job flows, public directories, and the super-admin dashboard.
6. Merge to `main` only after preview QA passes and production environment variables are confirmed.
