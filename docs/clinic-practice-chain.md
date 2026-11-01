# VetConnect Clinic & Practice Chain: implementation boundary

Status: design and code review, 1 November 2026.

## Principle
One authenticated person owns a durable personal profile. A clinic, hospital or company has a **separate organization ID**. Owning a facility does not verify a veterinary licence; being a veterinarian does not grant company access. Never create a second personal account merely to manage a clinic.

## Existing storage and ownership
- `profiles.id`, `professional_profiles.user_id` = personal identity.
- `clinics.id`, `clinics.owner_id` = separate facility profile and owner.
- `clinic_members` = invited, approved, ended and public/private relationships. Pending affiliation is not ownership or practice authority.
- `clinic_services` / `service_catalog` = standardized services, optional prices and durations.
- `clinic_availability` = weekday hours, breaks, 24-hour setting and bookable slots.
- `clinic_appointment_requests` = contact and booking requests; **not** a patient health record.
- `companies`, `company_members` = separate employer/company identity and permission-scoped company workspaces.

## Clinic onboarding user experience
1. In `/career/connections`, choose: manage/create a facility, link to an existing clinic, or see company memberships.
2. In `/dashboard/clinics`, save an **unpublished, pending** clinic draft. Capture responsible veterinarian's full name and PVMC registration number, even when the owner is a company.
3. In `/dashboard/clinics/[id]`, complete location, services and species, weekday schedule, service duration, optional consultation fees, and team affiliations. A responsive anchor navigation keeps sections organized without copying the form.
4. The owner can continue editing a private clinic. An administrator checks PVMC credentials from authorized evidence (manual; no auto-registry API), clinic completeness and other publication requirements. **Only then** may the clinic become public.
5. The public clinic listing does not reveal private PVMC evidence, personal CV files, applicant records or private professional contacts.

## Core clinic publication readiness (new helper)
- Clinic name
- Named responsible veterinary practitioner and PVMC registration number
- Province and city
- At least one open day in the weekly schedule
- At least one active, public service from the catalogue

Readiness only means these **fields are present**. It does not mean PVMC verification, ownership confirmation, adequate documentation or clinical authorization. VetConnect's review team must verify those separately and record its source/status. The owner cannot self-approve.

## Review routing
- `reviewProfileAction` clinic branch: explicit manual PVMC acknowledgement + meaningful audit note + fields/hours/service checks before approval.
- `reviewRegistrationSubmissionAction` clinic-intent company branch: same checks before calling registration review RPC.
- Staff-assisted create: always pending and unpublished; no quick publish shortcut.
- **Important launch blocker:** the existing `review_registration_submission` database function can publish clinic records, and trusted database/admin operations can modify publication fields. Server checks alone are insufficient against every privileged entry point. Review and enforce the same readiness/authorization rule at the DB transaction boundary before merging. Verify the registration-stage access path does not deadlock users needing to finish clinic setup.

## Future modules, not in this PR
- **Pet/animal records**: verified owner-to-animal consent, clinic-specific permissions, clinician attribution, treatment notes, audit logs, correction history, retention and authorized data transfer. Do not reuse appointment requests as patient records.
- **Customer portal**: a separate customer login can claim/manage their own pet or livestock records and consent to sharing with a treating clinic; never infer ownership from an email or phone number alone.
- **Payment system**: displayed service fees are not payments. Before accepting money, design invoices, transaction ledger, refunds, gateway webhooks, reconciliation and permission controls. No wallet/card capture in the current clinic form.
- **Laboratory integrations**: reference a separate lab identity and service catalogue; link orders/results to patient records with access controls and explicit consent.
- **Canonical places/entities**: store canonical location and service IDs, aliases and safe fuzzy suggestions. An unreviewed fuzzy match must never silently merge two clinics.

### Confirmed read-only RLS audit (1 November 2026)
- `public.is_account_active()` requires `profiles.account_status='active'`.
- `public.can_manage_clinic(clinic_id)` also requires an active account and either the facility owner or an administrator.
- `clinics` and `clinic_services` include active-account guards; `clinic_availability` is controlled by `can_manage_clinic`.
- If a clinic-intent company account is not yet active, requiring all its service hours before registration approval creates an **onboarding deadlock**. The registration review and clinic publication statuses must be separated in the underlying workflow, so an account may complete its private facility draft without simultaneously publishing the facility.
- Verify all direct RPC and administrative paths cannot publish incomplete clinics; only then finalize the migration/review design. Do not weaken RLS or bypass account checks just to work around the flow.

## Release and QA
- Run source tests, TypeScript, lint, locked dependency audit and production build against the exact PR head.
- Authenticate as owner, clinic member, employee, reviewer and unrelated user. Verify no cross-user clinical, team or appointment data is visible.
- Test 360px / tablet / desktop, Pakistan location selects, weekly hours including 24h, service fees, invitations and rejection flow.
- Check both independent approval routes, direct privileged/API entry points and RLS. Never mark a clinical practice verified solely because a user typed a PVMC number.
- Keep production unchanged until all gates pass.
