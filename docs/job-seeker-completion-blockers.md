# Job seeker career workflow: 1 November 2026

The registration completion page was blocked by missing registration_completion_gate, registration_evidence and registration_profile_details tables in Supabase project oflwhfptrorsjvhlofrn. The reviewed registration migration chain was syntax-tested in an isolated PostgreSQL engine, applied atomically, and verified with RLS enabled, a private evidence bucket, and submission/review functions present. The deployed repair is recorded as 20261101073352_registration_completion_dependencies_repair.

The additive career migration 20261101073714_job_seeker_preferences_alerts was also applied and verified. Existing candidates were not subscribed to email alerts. The queue has no authenticated/anonymous read or write access. Its claim function is executable only by service_role; the photograph bucket is private. No production candidate data was deleted or test candidate inserted.

## Implemented application behavior

- /career is a verified-email, authenticated private career workspace available while administrator registration review is pending. This does not bypass job application eligibility or administrative approval. Existing dashboard gates remain.
- /career/cv prefills education, experience, skills and contact information from the owner's account. Existing CV edits, including deliberate blanks, win over imported defaults. Core CV readiness needs name, headline, education and skills; work experience is optional for new graduates. It never invents missing qualifications or experience.
- Photographs may be uploaded privately with size, type and file-signature validation. The private preview and printable/PDF CV also reuse the owner's registration profile photograph when no CV or professional photograph is present. Identity document types are never selected as photographs.
- /career/preferences captures multiple roles, sectors, employment types, countries and cities, national/international searches, remote/hybrid/on-site preferences, salary range, three-letter currency, pay period, salary flexibility and undisclosed-salary preference. Empty lists mean open search. Alerts require explicit opt-in and can be disabled on this page.
- Admin and employer job creation capture country, work arrangement and an actual employer-disclosed salary range. Job detail pages show those fields. These values are not official pay scales or a claim of statutory compliance; no exchange rate or salary benchmark is invented.
- Database triggers enqueue work on job publication or relevant job edits, CV changes, preferences, account reactivation, profile approval and email confirmation. An approved, published, unexpired job and an active, approved professional with verified email, CV and consent are required for job alerts.
- The worker rechecks job state, current consent and account eligibility immediately before send. It matches preferences and existing location coverage, adds CV skill overlap to its explanation/score, and saves the match to job_matches. A suggestion does not certify qualification, experience, visa eligibility or appointment.
- Core CV completion queues a separate applicant receipt and admin notice once; neither attaches a CV or identity files. This is not professional verification approval.
- Queue leases use FOR UPDATE SKIP LOCKED and claim tokens. Provider requests use stable idempotency keys. Failures back off up to 8 attempts, within a 20-hour retry window to stay within the provider's idempotency lifetime. Expired uncertain deliveries require operator inspection, not blind replay. Provider acceptance is recorded as accepted, not delivered. Refreshing/republication does not resend accepted alerts.

## Deployment and delivery blockers

On inspection of Vercel project vetconnect, the production environment did not contain these required keys:

- RESEND_API_KEY
- VETCONNECT_NOTIFICATION_FROM (a verified sender)
- VETCONNECT_ADMIN_EMAIL
- SUPABASE_SERVICE_ROLE_KEY (server-only)
- CRON_SECRET

NEXT_PUBLIC_SITE_URL and the public Supabase configuration are present. Configure missing secrets in Vercel project settings, never in source code or chat. The worker refuses to send when configuration is incomplete or VERCEL_ENV is not production. The protected cron endpoint is /api/cron/career-alerts; the observed Hobby plan supports a daily schedule only, so vercel.json uses 03:00 UTC (08:00 Pakistan time). For faster alerts, configure a supported external scheduler with the same bearer secret or an appropriate hosting plan; do not assume scheduling or email is active before configuration is verified.

The frontend/worker commit must be published and deployed before new routes are live. Authenticated browser/mobile QA and a controlled candidate/admin email delivery check remain release requirements. A real candidate must confirm their own email and supply their own photograph and qualifications. No personal candidate information has been fabricated or filled on anyone's behalf.

CVs remain private for download and deliberate attachment to applications. This patch does not create an unsolicited public CV directory. Existing professional profile publication continues through its existing review workflow.
