# VetConnect CV application: login-required policy

The former guest/no-login application proposal is withdrawn at the user's explicit direction.

**Every CV upload and job application requires a signed-in Candidate, Professional or Veterinarian account with a verified email address.**

The final required CV upload field and the final required application field ask the applicant to **re-enter their own VetConnect account email**. A server-side Supabase Auth `getUser()` check verifies user ID, `email_confirmed_at`, and a case-insensitive exact account-email match before saving. An arbitrary or different email cannot be used to represent the applicant.

Saved uploaded CVs and CV Builder documents remain available through the signed-in Career Workspace. New file uploads accept PDF, DOC, DOCX, JPG and PNG, up to 5 MB. An approved career profile and owned CV selection are mandatory to apply to a job.

Employers access CVs through authenticated permission-controlled private download links. Optional email notifications have a sign-in-only employer dashboard link, not an unsecured CV attachment.

Former guest UI, guest server actions, verification page and guest CV download endpoint are deleted. An additive database lockdown migration revokes anon and authenticated direct access to the historical guest applications table and retains a private bucket solely for migration integrity. No existing CVs or job applications are deleted.

Release requires successful GitHub CI, authenticated workflow E2E tests, Security Audit resolution and a fresh verified Vercel Preview. No production deployment has been authorized as part of this change.
