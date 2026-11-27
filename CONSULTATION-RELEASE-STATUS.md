# Vet-Connect consultation release hold

Integration baseline 2884dde62c27856699c77f79a3c740328aba758d. The consultation files were reconciled against main from VetConnect-Consultation-Phase-1-2-3-Updated-Source.zip (SHA-256 cfcf0fde8bf7bd4739d5e14c872a104de40a4a82064a538295c00c8523789bc0). The unrelated company/admin changes from the archive were excluded. Production activation is disabled.

| Area | Implemented in this branch | Outstanding release evidence or implementation |
|---|---|---|
| Preferences and directory | Authenticated workspace, presence heartbeat with database timestamps and 90-second expiry, fees, eligibility and public filters | Multi-tab and device tests, realtime delivery |
| Calls | Allowlisted request/accept/decline/cancel, room-specific temporary tokens, lazy-loaded Daily Prebuilt, private rooms with expiry and two-participant cap | Real audio/video and failure recovery tests, live provider-confirmed completion |
| Cost control | Fixed-order participant locks, atomic reservation of 20 participant-minutes per 10-minute room, month boundary refusal, restricted provider reconciliation and 80% budget alert, no calls without approved budget | Tenant billing allowance, external usage, real provider reconciliation and threshold verification |
| History and administration | Participant history, missed requests, settings audit, restricted aggregated report by date, CSV, budget display | Authoritative durations and live meeting counts, push notifications and authenticated acceptance |
| Appointments | Existing clinic scheduling and week/month calendar, additional day view | Owner-operated tele-veterinary appointment linkage implemented; multi-clinician assignment and live calendar acceptance pending |
| Integration | Additive migrations, RLS, isolated PGlite tests, shared provider interface | Supabase staging upgrade/rollback, authenticated browser and production acceptance |

Daily publishes a general allowance of 10,000 participant-minutes per month at https://www.daily.co/pricing/video-sdk/. No account-specific allowance has been confirmed. Reservations are retained after ambiguous provider responses. Do not raise the budget or release reservations based on client events.

## Verification and operation

Use Node 22, npm ci, npm run test:consultation and npm run release:check. Apply the dated foundation migration followed by the operations migration only in an isolated clone of the platform schema. Enable the preview-only flag, enroll two controlled test identities and approve a month-specific budget only after confirming Daily domain ownership, key rotation and remaining account allowance. Do not use a preview wired to the production database. The application defaults to disabled enrollment and no budget.

Rollback rehearsal should first disable publication, disable preview calling and allow issued room tokens to expire. Revert the application deployment; retain the additive tables and their RLS while validating historical records. No production migration, activation or rollback was performed. See CONSULTATION-MASTER-SPEC.md for T01–T24 and the release contract.
