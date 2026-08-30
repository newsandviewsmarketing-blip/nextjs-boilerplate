# VetConnect Master Closure 2026-08-30

## Purpose

This package consolidates the operational gaps identified during Batch 1 and Admin Control Batch 1.1 QA. It is designed to be applied to the existing `vetconnect-batch1-workspaces-2026-08-30` branch and tested in Vercel Preview before merge to `main`.

## Database migration

Run only after the already-applied migrations:

- `202608300001_profile_standardization.sql`
- `202608300002_workspaces_and_media.sql`

New migration in this package:

- `202608300003_master_closure_operations.sql`

Do not rerun 001 or 002.

## Master closure scope

### Delegated administration

- Fine-grained per-user admin grants and revocations in addition to staff roles.
- Super Administrator can delegate assisted profile entry, company creation, clinic/lab management, product/job entry, directory management and master-data management.
- Existing reviewer decision and audit accountability remain separate from role assignment.

### Staff-assisted records

- Admin staff can create managed veterinarian/professional records without creating a fake client login.
- Managed records can carry client contact information and can later be linked/claimed by a real user account.
- Admin-assisted Company, Clinic/Hospital, Laboratory, Product and Job entry uses the same canonical database as self-service records.

### Master Data Studio

Reusable dropdown values are stored in `master_data_items` so authorized staff can add/deactivate options without a code deployment. Initial categories include:

- Pakistan province/district/tehsil/city extensions
- veterinary sectors, specializations and services
- business/facility/laboratory types
- laboratory tests and species
- product categories, dosage forms, presentations, packaging, vaccine types, concentration units and administration routes
- job sectors and employment types

### Canonical businesses and directories

- Company identity is separated from legacy login ownership.
- Company public names use canonical company/trade/legal identity instead of registration-number-like placeholders.
- Products and jobs can link to canonical companies even when entered by VetConnect staff.
- Public company, veterinarian, professional, clinic and laboratory screens expose approved public fields only.

### Location, contact and external links

- Pakistan location inputs merge built-in administrative data with Admin Data Studio extensions.
- Clinic and laboratory public pages support public phone, email, website and Google Maps links.
- Company public pages provide direct public contact/site/map navigation where available.

### Clinic operations

- Public clinic appointment requests are stored in `clinic_appointment_requests`.
- Clinic owners can see incoming requests and move them through operational statuses.
- Clinic profile/location/media/services remain part of the existing Clinic Workspace.

### Laboratory operations

- Public test-information requests are stored in `laboratory_information_requests`.
- Laboratory owners can review incoming enquiries and update status.
- Public lab pages use real backend records when Supabase is configured instead of silently falling back to fictional sample records.

### Admin operational directory

- Unified table-based Admin directory covering accounts, managed people, companies, clinics, laboratories, products and jobs.
- Direct hyperlinks to account dossiers and public records where applicable.
- Account dossier explains separate account, professional-profile, veterinarian-profile and PVMC/public-eligibility states.

### Company self-service

- Company-created products retain the moderation workflow but use database-driven product/category/packaging/vaccine/route options.
- Company-created jobs use database-driven employment/sector options and dependent Pakistan location fields.
- Canonical company identifiers are written with new products/jobs while preserving legacy compatibility.

## QA completed in the working package

- Source tests: 24/24 passed.
- Structure audit: 96 required entries passed.
- TypeScript/TSX syntax transpilation: passed across project source files.
- Full dependency-aware `typecheck`, ESLint and Next.js build must be rerun by Vercel/CI because this packaging environment does not contain project `node_modules`.

## Required deployment sequence

1. Stay on branch `vetconnect-batch1-workspaces-2026-08-30`.
2. Extract the changed-files ZIP into the repository root and replace matching files.
3. Review GitHub Desktop changes. Do not modify `.env` or secrets.
4. Commit: `VetConnect master closure delegated operations and data studio`.
5. Push the branch and confirm the `vetconnect` Vercel Preview build is Ready.
6. In Supabase SQL Editor run only `202608300003_master_closure_operations.sql` once.
7. Test the Preview, especially Admin Assisted Entry, Data Studio, Master Directory, company product/job entry, clinics, labs, public vet/professional visibility, appointments and test enquiries.
8. Merge to `main` only after Preview QA passes.

## Acceptance checks before merge

- An authorized second/third-level administrator can create only the record types granted by Super Admin.
- Revoked per-user permission overrides a broader staff role.
- Data Studio additions appear in relevant dropdowns without a source-code change.
- A staff-created veterinarian/professional can exist without a fake login and can be published only after the required review state.
- Company public name is a business name, not a registration number.
- Admin-created product/job is linked to the selected canonical company.
- Public clinic appointment creates a database request visible in Clinic Workspace.
- Public laboratory enquiry creates a request visible in Laboratory Workspace.
- Google Maps/public contact links open from approved public clinic/lab/company records.
- Public veterinary records show only eligible approved records and the Admin dossier identifies the blocker for non-visible accounts.
- Master Directory works as a table and links to relevant record/dossier pages.

## Safety and governance

No service-role key belongs in browser code. Private documents remain private. Public-directory publication, professional verification and veterinary credential verification are deliberately separate decisions. This package does not bypass review merely because a record was created by staff.
