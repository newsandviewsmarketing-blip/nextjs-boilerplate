# VetConnect Veterinary Practice Management: implementation contract
Status: audited proposal, 3 November 2026. NOT released, not a claim of operational functionality.

## Verified existing baseline (read-only)
- Production Supabase contains veterinarian_profiles (10 rows), clinics (3), clinic_availability (7), clinic_services (2), and clinic_appointment_requests (0). Counts are NOT proof of verified licensing.
- Existing /dashboard/clinics and /dashboard/clinics/[id] provide owned clinic draft/edit, service catalogue and fee quotes, weekly schedule/slots/breaks, staff affiliations, and appointment request management.
- No first-class patient health records, authored clinical encounters/prescriptions, sales invoices, receipts, accounting ledger, or owner report delivery module was found in current schema.
- Existing clinic appointment requests are NOT medical records; existing service fees are NOT invoices or payments.
- Clinic publication and practitioner PVMC verification must stay independently reviewed, following docs/clinic-publication-release-gates-2026-11-02.md and docs/clinic-practice-chain.md.

## Product workflow
1. Register a person once; enter educational qualifications, PVMC practitioner number/evidence only for clinical veterinarian. Human verification determines practice status.
2. Vet creates/claims clinic, records separate responsible vet, hours, appointment slot duration, breaks, species and fees. Clinic remains unpublished pending human facility approval.
3. Clinic staff (explicit role-specific invite and acceptance) enters owner/client with consent and creates patient: patient ID, species, breed, sex, microchip/tag where relevant, DOB/age estimate, weight WITH kg/unit and observation date, herd/farm linkage optional. Owner and clinician permissions distinct.
4. Appointment links to a particular clinic, practitioner, client and patient only after verified matching; walk-in visits are independently supported.
5. Visit/encounter includes date/time, chief complaint, clinical history, physical examination, objective measurements with units, differential/assessment, tests ordered, recorded results, treatment plan, follow-up and authored diagnosis. Clinical documents must show who entered/signed/changed them.
6. Prescription is *manually authored and explicitly signed by authorized clinician*: medicine/generic, strength, species, route, frequency, duration, quantity, advice, applicable food-animal withdrawal only when supported and clinician confirmed. No automatic treatment recommendations or invented withdrawal intervals. Generate printable PDF versioned snapshot and record revisions/cancellations.
7. Checkout produces itemized invoice with services/stock product line, tax/discount explicitly applied, immutable totals, invoice number, currency, payment state; receipts and refunds tracked separately. Keep journal/ledger consistent; do not call a price estimate a payment.
8. Visit summary/report can be reviewed, signed and delivered to verified client email via secure expiring link (not raw sensitive attachment by default). Separate consent, delivery-state audit, failure/retry, and optional staff/admin operational notification with minimum necessary metadata. Never send clinical notes to platform admin by default.
9. Customer portal exposes only owner-authorized patients, visit reports, invoices, appointments and sharing approvals. Claims of animals cannot rely on a matching email/phone alone.

## Proposed additive data model (do not execute in production without isolation tests)
- clinic_clients: clinic_id, client_id, auth_user_id nullable, name, contact methods, verified/consent status, created_by, retention status.
- animal_patients: clinic_id, patient_id, client_id, species, breed, identifier, estimated_age, sex, status, created_by. Stable patient IDs, never guess identity.
- patient_measurements: clinic_id, patient_id, measured_at, kind, numeric_value, unit, practitioner_id; distinguish kg/lb, temperature °C, etc.
- clinic_encounters: clinic_id, patient_id, client_id, appointment_id nullable, clinician_id, visit_at, clinical fields, lifecycle (draft/signed/amended), signed_at, version.
- encounter_medications: encounter_id, medication identity, units, explicit clinician-validated instructions and indication, optional signed food-safety withdrawal notes.
- diagnostic_orders, diagnostic_results, result_attachments (private), report_versions and report_access_grants.
- clinic_inventory_items, stock_movements, invoice_headers, invoice_lines, payments, refunds, financial_ledger_entries with idempotency keys and transaction integrity.
- clinic_notifications_outbox: exact recipient, consent, purpose, report_version_id, delivery_attempts, provider acceptance, expiration.
- clinic_audit_events: actor, clinic, patient, event, previous/new version metadata, immutable timestamp. Avoid storing extra raw medical details in audit logs.
- Separate typed user roles: facility owner, verified vet clinician, delegated clinical assistant, reception, cashier/accounts, client. Roles cannot self-grant clinical signing or cross-clinic read.

## Security design
- Every new table in public schema has RLS enabled before API exposure; clinic ID is always checked against an authenticated authorized membership and purpose. Clinical staff can view relevant patient data only where granted. Cashier may read invoice totals but not treatment notes. Reception may book but not prescribe. Client can only access their verified associated patient and explicitly shared report.
- Test cross-clinic, cross-owner, suspended account, revoked staff access, anon/public, direct REST/RPC, forged UUID and signed-document immutability. Admin operational oversight must not be a blanket medical-record read permission.
- Private Supabase Storage and short-lived signed URLs for results and prescriptions; no public media bucket or logs containing patient medical details. Encrypt in transit and follow retention/consent policy, including record correction without erasing clinical history.
- Clinical medications/withdrawal are clinician-entered and subject to PVMC practice authorization. No automatic PVMC approvals.
- If service notification credentials are absent, queue safely and show Pending/Failed, never display Sent without provider confirmation; provider accepted != delivered.

## Sequential release slices and acceptance gates
### A. Identity, clinic and schedule (existing code repair)
- Reconcile registration/profile and facility/publication database gates. Confirm old 3 clinic records manually without inferring practitioner status.
- Test seven-day times, 24-hour and breaks, timezone Asia/Karachi, overlap rules, slot capacity, staff shift coverage, appointment lifecycle and conflict control.
- Acceptance: no publicly approved clinic without required independently verified approval; no double-booking, no unauthorized schedule changes.

### B. Clients, animals and clinical visit baseline
- Add migration + RLS + private records UI: authorized client record, patient card, dated weight, walk-in and booked visit linking, encounter note with signed/amended status.
- Acceptance: clinic A cannot access clinic B; customer consent/revocation tested; patient ID and measurement units persist across reload; all signed edits retain history.

### C. Prescription and diagnostics
- Clinician-signed PDF prescription with revision and print; diagnostic order/result upload and supported report version, no automatic medicines or withdrawal claims.
- Acceptance: non-clinician cannot sign; unsigned draft never labeled valid prescription; private result cannot be fetched by a different account.

### D. Sales, invoicing, inventory and accounts
- Itemized billing, credit/partial payment, receipt/refund, daily cash/receivables, stock adjustments and ledgers, no payment gateways until webhook and reconciliation tests.
- Acceptance: totals deterministic, no negative/duplicate payment, role-level separation of duty, historical invoices immutable with adjustments instead of silent edits.

### E. Reports, delivery and client portal
- Consented client email links, clinic notices, appointment reminders, patient report and transaction history, controlled optional account alerts.
- Acceptance: verify sender and real delivery; expired/revoked report links fail; no clinical data emailed to VetConnect super-admin by default; GDPR-style promises not made without applicable legal review.

### F. Release verification
- Exact-head CI (lint, tests, TS, build, security), isolated Postgres migration and RLS tests for all actor roles, production-like auth E2E including mobile 360px/tablet/desktop, verified emails, backups/rollback and deployed SHA. Only then migrate production and promote same tested Vercel build.
- Do not merge unrelated PR #68 or #76 migrations as a side effect. Document and test dependencies and domain aliases.

## UX navigation proposal
Veterinarian dashboard: Profile & PVMC | My Clinics | Schedule | Appointments | Clients | Patients | Consultations | Prescriptions | Diagnostics | Sales & Inventory | Accounts | Reports | Settings.
Clinic dashboard: Today (appointments, pending records, balances) -> Clients / Animals -> Visit -> Prescription -> Invoice -> Report -> Secure Share.
No invented figures or fake completed statuses. VetConnect admin monitors clinic publication, licensing review, service availability and aggregate operations, not private patient notes.

## Definition of done
Functionality requires **deployed, authenticated, role-tested end-to-end actions** and verified persistence and notifications, not merely screenshots, documentation, tests passing on source, or a Vercel READY badge. Every slice must be reviewed independently before production.
