# Registration Category Onboarding — VetConnect (Draft)

## Registration and review flow
- The existing category cards remain in place, with distinct veterinarian, candidate/student/job-seeker, allied professional, company/employer, clinic, laboratory and customer criteria.
- Every account must save a valid Pakistani CNIC number and provide front/back CNIC evidence. Individuals provide a profile photo; companies, clinics and laboratories provide a logo.
- Veterinarians provide PVMC registration number, degree and PVMC evidence. Students provide current enrollment proof and university registration details. Job seekers provide highest qualification evidence. Allied professionals provide qualification proof. Employers provide company registration/NTN evidence. Clinics provide facility/business proof and responsible veterinarian PVMC evidence. Laboratories provide registration/licence proof.
- Evidence uploads go directly to private Supabase Storage, are validated for category, MIME type, file signature and size, and are recorded as resumable account drafts after each upload. The authenticated owner can return using the same account and continue.
- Submission changes the registration gate to pending. The admin queue exposes documents through short-lived signed links only to users with profiles.review. Admins can approve or return an application with a required note. Only approval publishes eligible profiles/company/lab data. Veterinary practice still requires the existing separate PVMC review.
- New submissions/resubmissions send a document-free email to the configured admin address; decisions send a status email to the registrant. Email settings: RESEND_API_KEY, VETCONNECT_NOTIFICATION_FROM, VETCONNECT_ADMIN_EMAIL, and optionally VETCONNECT_APP_URL (defaults to the public VetConnect URL). Email delivery must be verified in staging.
- There is no registration payment flow in this change. Existing public API routes/contracts and site branding are unchanged.

## Database migrations and checks
- 20261027120000_private_registration_evidence.sql creates the private evidence store and signup completion gate.
- 202610280001_registration_review_workflow.sql adds incremental drafts, admin-only review access, approval state and approval RPC, plus laboratory registration/logo fields.
- Neither migration has been applied to production. Apply both in order to an isolated staging project, inspect policies and role grants, and verify no public exposure.
- Staging checklist:
  1. Confirm email signup/OTP and password sign-in for each category.
  2. Confirm required fields and document rules for each role and pathway.
  3. Save partial drafts, sign out, return with the same account, and continue.
  4. Check owner/admin/unauthorized storage and database reads; ensure signed admin links expire and are not sent by email.
  5. Verify pending registrations cannot enter the dashboard or public listings.
  6. Approve and reject as an authorized admin; verify public visibility only after approval and verify rejection notes/resubmission.
  7. Verify admin and registrant email delivery without document attachments.
- GitHub CI must pass on the final commit. Browser QA with real CNIC data is prohibited; use synthetic staging-only data.

## Privacy and release controls
- CNIC, identity documents and credential files are sensitive. Keep registration-evidence private, never put document contents/URLs/CNIC into public profiles or email, and use short-lived signed links only for authorized reviewers.
- A retention/deletion schedule for CNIC and credential evidence has not been selected. This must be decided and documented before production rollout; migrations do not auto-delete.
- PVMC registry checks, degree equivalency and licence validity remain manual.
- PR #42 is stacked on the security recheck PR and is draft. No production migration or deployment has been made. Merge dependencies and complete staging checks before production release.
