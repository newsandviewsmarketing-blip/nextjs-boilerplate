# VetConnect: Online consultations, clinic appointments and veterinarian discovery

## Homepage decision (23 November 2026)
Keep four distinct cards:
1. **Online Consultations** (remote tele-veterinary care, only by a verified and opted-in practising veterinarian and an enabled service).
2. **Industry Advisory & Professional Consultants** (nutrition, poultry, dairy, fisheries, research, academia; do not imply clinical diagnosis/treatment).
3. **Veterinary Clinics & In-Clinic Appointments** (a separately bookable in-person service for a clinic actually offering appointments).
4. **Diagnostic Laboratories** (directory entry only until verified public listings exist).
This avoids duplicating a second in-person clinic card alongside the clinic directory.

## Provider-confirmed availability (proposed backend workflow, NOT deployed)
1. A PVMC-credential-verified, administrator-approved practising veterinarian explicitly opts into tele-veterinary consultations via their own dashboard or approved clinic workspace.
2. Ask provider to select practice categories (pets, livestock, poultry, dairy, equine, fisheries/aquaculture) plus applicable service expertise (orthopaedics, rehabilitation/physiotherapy, nutrition, farm advisory, etc.). Treat specializations as user-supplied claims until independently reviewed.
3. Provider selects weekly local availability in Asia/Karachi: day, start/end, slot duration, booking cut-off, breaks; date-specific closures/exceptions; vacation status. Optional online vs in-clinic vs farm-visit service modes are independent.
4. Before publishing, require explicit confirmation and clinic/practitioner authorization. Show **Available by appointment** only if the approved service is enabled and future slots genuinely exist. Show **Online now** only with an actual fresh real-time presence heartbeat AND confirmed consultation eligibility. Never infer this from opening the site or from a fixed weekly schedule.
5. Public directory returns only clinic/practitioner public ID, published name, published photo, sector, expertise, verified status and actual published availability; no CNIC, PVMC document scans, private telephone, staff notes or hidden work hours.
6. Server-side slot reservation must be atomic and prevent overlaps, expired times, duplicate requests and reuse of invalidated sessions. Existing appointment requests stay intact; avoid changing them in the homepage UI task.
7. Privileged admin can correct/disable a provider's service with audit trail, but cannot silently self-confirm the doctor's availability on their behalf.
8. Respect RLS: account owner can change own permitted schedule; clinic managers limited to their own clinic; public SELECT only through a deliberately restricted read model. Security review required before any migration.
9. Each service status in UI should distinguish **Provider has online service**, **Next available slot** and **Actually online now**.
10. Before launch, get doctor confirmations, legal/clinical terms review, audit booking timezone/availability, test mobile and privacy.

## Veteran discovery ordering
- Hard eligibility: administrator-approved *public* profile AND separately approved PVMC credential.
- First ranking dimension: objective completeness of public city, sector, specialization, voluntary photo; do not score people's looks, name, professional competence or clinical outcomes.
- Keep rotation/scroll as a browse aid, not an invented 5-star ranking.
- Alphabetical ties. All approved eligible professionals remain discoverable on the full directory, not just the homepage's first 24 records.
- Any clinic/company name appearing as a credential-verified individual is an identity-quality review case; do not silently change original applicant data.
- Desktop marquee pauses on pointer hover and keyboard focus; mobile scrolls manually; reduced-motion users receive static cards.
- Admin should expose profile-completion checks separately from PVMC verification.

## Required QA
- New approved vet becomes visible after a fresh request; revoked profile/PVMC does not appear.
- No duplicate vet when legacy + managed data overlap.
- Empty provider list yields honest message; no fake 17 doctors online.
- A clinician who did not opt in cannot appear as an online practitioner.
- Verify link targets, actual service filters, authenticated preview, 320/375/412px breakpoints, keyboard and screen-reader experience.
- Existing live Supabase schema, storage, passwords, and user profiles unchanged by this UI branch.
