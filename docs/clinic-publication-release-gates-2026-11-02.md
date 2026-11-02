# VetConnect | Unified workspace release gate (2 November 2026)

## Release principle
**One account and one permission-aware workspace shell; linked professional, clinic, company and laboratory identities remain separate records.** Treat core-profile completion, registration review, PVMC credential verification, facility publication, jobs/CV and product moderation as separate states.

This document describes the integrated source branch superseding the isolated clinic and profile-navigation fixes. It does **not** certify production deployment, migration readiness, or real user workflow completion.

## Included in one proposed change set
- Merge PR #63 profile stepper, 6-step form and focused CV/applications view into the role-aware shared shell introduced by merged PR #65. Preserve existing admin layout and permission checks.
- Multi-company users select an authorized company explicitly; no more automatic first-company selection. Product, job, applicant and company mutations must re-check current membership on the server. The ID in a query string or form is a **requested context**, not authorization.
- A person registered as a company or clinic owner does **not** need a PVMC practitioner number solely to own the organization. A veterinarian applying to practise clinically requires a PVMC number and evidence. The actual clinic has an independent responsible-veterinarian and human evidence-review gate before new publication.
- The private registration form, allowed evidence types, both registration submission and review RPCs, and nullable legacy `registration_evidence.cnic_number` are updated **together** in the staged SQL so new records can proceed without mandatory CNIC documents. No historical CNIC or uploaded document is deleted or published. Historical sensitive data needs a separately authorized retention plan.
- Public clinic directory view is extended to include existing `other_cities` data expected by the application; public facility labels distinguish VetConnect's facility profile review from independent PVMC credential verification.
- Source regression checks cover form/migration alignment, role-based profile navigation and company-context enforcement.

## Current hard blockers and required owner actions
1. **Migration dry run is outstanding.** Run the entire staged migration and its tests against an isolated copy/compatible test database. Specifically verify clinician approval without an owner PVMC, each registration category's uploads, role-based RLS, separate clinic publication, rejected/resubmitted reviews, no accidental disclosure or loss of old evidence, and existing public directory data.
2. **Legacy clinics require manual reconciliation.** The audit showed three published clinic rows with no PVMC number in the clinic-specific responsible-veterinarian field. This is not evidence that a practitioner is unlicensed. No automated certification or unpublishing was performed.
3. **Email sender and cron secrets are missing.** Vercel production project `vetconnect` had no RESEND_API_KEY, VETCONNECT_NOTIFICATION_FROM, VETCONNECT_ADMIN_EMAIL, SUPABASE_SERVICE_ROLE_KEY or CRON_SECRET during the read-only review. Two queue messages remained pending with zero attempts. Owner must securely configure verified sender and secrets in Vercel settings; never paste secrets into GitHub or chat. Run controlled consent and actual delivery evidence checks.
4. **Public database security advisories require targeted review.** Public directory views currently use definer rights and there are callable definer functions. Check explicit grants and row predicates before hardening. Do not globally revoke access and break legitimate directory/RPC access.
5. **Vets Guide evidence-backed ingredient / species / withdrawal workflows and product-variant publication remain unverified.** Do not invent product withdrawal values or approve unreviewed medical product claims.
6. **Vercel daily deployment rate limit** blocked the most recent production build. Multiple preview projects are not equivalent to the production custom-domain alias. No forceful deployment was attempted.
7. **Authenticated multi-role QA** remains necessary for admin/staff-only, veterinarian, professional, student/candidate, company owner/delegate, clinic and laboratory accounts at 360px, 768px and desktop. Test keyboard and screen readers for stepper, selected company persistence, save/reload, RLS denial across companies, CV privacy and clinic appointments.

## One verified rollout sequence (do not reorder)
A. Run exact-head repository audit, lint, all tests, TypeScript, build, dependency audit; reject on any failure.

B. Dry run one coordinated migration with full rollback/checkpoint, verify trigger enforcement and visibility of `public_clinics.other_cities`, then perform authenticated staging journeys and adversarial RLS tests. Review historical clinic records individually.

C. Verify deployment project, domain mapping, environment availability, sender configuration and intended commit. Confirm deployment quota available.

D. Only after all gates pass, apply the tested additive/compatible migration, stage production build, test it and promote that same build to the custom domain. Keep previous Vercel deployment and data restoration procedures available.

E. Check live /dashboard, /admin, /dashboard/company, /dashboard/professional, /clinics, product pages, jobs and alerts. Record exact production SHA; monitor logs and email provider delivery events.

**Status:** Integrated source update prepared in PR #66. No deployment or live database/record/authorization changes have been made by this update. Any untested component remains an explicit blocker, not an implicit approval.
