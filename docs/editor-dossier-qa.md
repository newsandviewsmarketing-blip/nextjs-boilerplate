# VetConnect Admin Editor Dossier (trial, not production)

## Observed issue
One account had a promotional website URL stored in profiles.full_name. It is an account, not a file or published article. At inspection there were no associated products/jobs/veterinarian or professional profiles, staff-managed documents or account-linked audit events. Do not open any untrusted outgoing link.

## Updated user journey
Admin > Users (search and filter) > click a person's name to open a separate authenticated Dossier window > inspect stored data and linked records > review files and audit > correct fields, approve/reject submitted profiles, separately verify PVMC, suspend/restore account, update staff roles or individual permissions. Only authorized staff see control elements; all mutations authorize on the server. Avoid duplicated role-management forms in the account index.

## Security constraints
- Existing account is NOT automatically suspended or deleted. Admin must explicitly confirm suspension. No live data altered.
- Name validation prevents links and promotional phrases at OTP registration, password registration, and profile updates, but must eventually be backed by DB constraints and abuse/rate-limit controls, after cleaning grandfathered spam data.
- PVMC approvals never follow from ordinary profile approval.
- CV downloads remain owner/employer protected; only account-associated admin_record_documents use short-lived signed URLs when authorized.
- Audit trail is append-only in application workflow; missing historical events cannot be reconstructed. A successful data change with failed audit insert currently produces a warning and must be addressed with an atomic audited RPC if strict evidence is required.
- Public-profile links require verified/published state; absent profile pages are not clickable.
- Customer/public-facing pages are not the admin dossier. Authenticated admin routes must stay noindex and cache-protected.
- Manual authenticated role tests and mobile UI QA required before production.

## Not done yet
A universal cross-module editor for companies, clinics, laboratories, products and jobs with uniform audit controls is a distinct development task; existing edit/review routes remain. Do not claim all record types are fully editable from this first account dossier.

## Deployment
Branch security/editor-content-trace-20261026, stacked on Phase 1. Do not merge main, deploy production, or change Supabase tables/records without separate approval.
