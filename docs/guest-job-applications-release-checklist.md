# VetConnect Guest Job Applications: release checklist

The guest application system is **fail closed**. It will not accept anonymous CV uploads until every listed setting is configured on the correct Vercel environment. Never paste secrets into GitHub, source code, ChatGPT, screenshots or a public URL.

## Approved CV formats and limits

* PDF: 5 MB maximum
* Word DOC/DOCX: 5 MB maximum
* JPG/JPEG and PNG: 5 MB maximum
* A 6 MB server-action body cap accounts for form overhead.
* MIME/extension and magic-byte checks reject obvious malformed files. **These checks are not antivirus scanning.** Perform malware scanning and file safety review before production activation, particularly for Office/PDF files.

## Required Vercel environment variables

Configure separately for Preview and Production under the single `vetconnect` project:

* `SUPABASE_SERVICE_ROLE_KEY`: server-only Supabase credential, not `NEXT_PUBLIC_*`.
* `RESEND_API_KEY`: transactional email API key.
* `VETCONNECT_NOTIFICATION_FROM`: verified sending domain/address.
* `TURNSTILE_SECRET_KEY`: private Cloudflare anti-bot verification key.
* `NEXT_PUBLIC_TURNSTILE_SITE_KEY`: public site key for the matching application domain.
* `VETCONNECT_APP_URL`: exact HTTPS host of the current environment, used for email confirmation links.
* `VETCONNECT_GUEST_APPLICATIONS_ENABLED=true`: set only after the security and user-acceptance tests pass.

Do not set `VETCONNECT_GUEST_APPLICATIONS_ENABLED` to `true` until all other settings and checks are verified.

## Applicant experience

1. Logged-in applicants continue to choose an existing saved CV or VetConnect CV Builder profile.
2. Applicants without an account can upload a new CV if the guest feature is enabled.
3. Guest submits their full name, email, optional telephone, cover note, file and explicit consent.
4. CAPTCHA is verified server-side; rate limits apply by an irreversibly hashed IP and normalized email.
5. The pending CV is written to the private `guest-job-cvs` bucket. A 30-minute one-time email verification link is sent. If sending fails, the pending row and file are removed.
6. The **GET** confirmation page cannot complete verification automatically; the applicant must confirm with a **POST**.
7. Only email-verified guests appear in the company's Applicants dashboard. Authorized staff receive a short-lived signed download, not a public CV link.
8. If outbound email is configured and the company has an approved/public profile with contact email, the employer receives a **notification with an authenticated dashboard link**, not a CV attachment.

## Release tests

* Valid PDF/DOC/DOCX/JPG/PNG under 5 MB and size/format rejection.
* Duplicate application, invalid CAPTCHA, too many submissions, expired token, repeated token.
* Verified guest visible to authorized employer; pending guest and cross-company CV downloads forbidden.
* Existing signed-in application with previously saved CV and built CV, employer notification.
* Small screens (360 px, 390 px, tablet and desktop) and keyboard navigation.
* Antivirus/malware scanning, retention/purge of expired unverified submissions and transactional email delivery.
* Existing CI: full npm audit has unresolved high-severity development-only findings; obtain security review before merging.

## Privacy

Guest CVs contain personal information. No public listing, static attachment URL or email attachment is created. The storage bucket is private, RLS is enabled and direct unauthenticated database access is denied. Define and implement an automated retention window for abandoned guest CV uploads before launching the feature.
