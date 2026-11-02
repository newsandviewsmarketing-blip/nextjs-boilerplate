# VetConnect workspace consolidation audit

Date: 2 November 2026 (Pakistan). Baseline: main `8796d4f278faec97ec6c56fbc17e5bcf58dc1095`.
Scope: repository source, connected production Supabase metadata/aggregate queries, authenticated production dashboard and an existing authenticated preview/admin session. No production records, credentials, roles or review decisions changed. This is an initial audit and first implementation batch, not full platform certification.

## Evidence and delivery state

| Area | Observed evidence | Result / next work |
| --- | --- | --- |
| Progress consistency | `getCoreProfileProgress` already supplies four shared core checks. Preview and production browser sessions show different roles and records. | Do not compare percentages across accounts or deployments. First batch suppresses personal progress for identities without a career role. Profile steps, CV readiness, PVMC review and facility publication remain distinct. |
| Staff experience | Authenticated preview staff-only account displayed 25% personal progress, profile-photo link and CV Builder despite no career navigation. | First batch removes unrelated personal tools and adds permission-checked admin links on desktop and mobile. No role grants added. |
| Shared shell | Professional, account, clinic and company pages already share CareerWorkspaceFrame; laboratory used a separate public-header layout. | First batch moves laboratory operations into the same shell and adds laboratory navigation. Query errors no longer masquerade as no laboratory or no enquiries. |
| Multi-role connections | Company navigation checked only company role, although `get_my_company_workspaces` supports delegated memberships. | First batch uses current user's approved workspace RPC results to discover company access. Destination actions and RLS remain authoritative. |
| Company selection | `getCurrentCompanyWorkspace` chooses the first RPC result. | Multi-company context selection is still required. All mutations must use an explicitly selected authorized company, with cross-company denial tests. Do not implement a cosmetic selector without action/RLS coverage. |
| Admin counts | Main already has Approved/Pending/Rejected/New 24h tables. An older preview admin has a different arrangement. | Align deployed versions before judging visual parity. Counts are record counts, not unique people. Veterinarian and professional rows can describe one person. Do not sum them as unique users. |
| Production totals | 26 account rows; 10 veterinarian profiles; 20 professional profiles; 4 canonical companies; 3 clinics; 2 products; 2 jobs. All listed public tables report RLS enabled. | Snapshot counts are not evidence of completed workflows or correct RLS policies. No personal records exported. |
| Review status | Veterinarian profiles: 8 approved, 1 pending, 1 rejected. Professional profiles: 17 approved, 2 pending, 1 rejected. Clinics: 3 approved. | Profile approval is not practitioner licence verification or proof of safe clinic publication. |
| Clinic publication | Staged `20261101162000_separate_clinic_publication_from_registration.sql` exists; production clinics has only protect-verification and updated-at triggers, no publication-readiness trigger. Latest recorded production migration is `20261101083011`. | Release blocker: locally test migration against current registration RPC and clinic workflows; review before applying. Do not assume a UI gate enforces production database publication. |
| Practitioner review | Existing authenticated preview admin reports 5 PVMC data rechecks. | Review evidence individually. Do not automatically certify or reject records. PVMC requirement belongs to veterinary practitioners and responsible clinical practitioners, not unrelated professions or ordinary company owners. |
| Job seeker | CV, cover letter, internship/preferences, applications, matching worker and cron route exist. Production outbox has 2 pending messages. | Delivery is unverified. Check queue age/attempts, production cron execution and configured sender/provider without disclosing secrets. Do not claim alerts have been received. |
| Company products | Create/edit forms already include generic name, composition, category, packaging, pack sizes and meat/milk/egg withdrawal. | Preserve existing work. Product variants, ingredients, generic substances and evidence tables exist but have zero rows at this snapshot. Empty tables are not proof that their workflows are absent or functional. |
| Vets Guide | Generic/evidence structures are present, but populated and reviewed end-to-end guide data was not established. | Require source-backed ingredient, strength/unit, species, route, pack variant, label withdrawal and evidence relationships. Never infer a withdrawal period or a zero value from missing information. |
| Registration privacy | Existing staged registration-review SQL includes CNIC-front/back requirements. Earlier project requirements said avoid CNIC. | Reconcile live function, evidence form and private bucket together before changing requirements. Do not apply that staged migration wholesale without reviewing inherited requirements. |
| Security advisors | RLS enabled across listed public tables; advisor flags authenticated-callable SECURITY DEFINER functions and disabled leaked-password protection. | Inspect actual predicates and intended grants before acting. SECURITY DEFINER exposure alone does not establish an exploit. No blanket revocations that could break authorization helpers. |
| Profile navigation PR | PR #63 is open at audit time and addresses step selection/duplicate progress. | This batch starts from main and avoids ProfileBuilder edits. Validate both changes together before release. |

## Target experience

One account, one consistent workspace shell, separate linked entities and activity modules. A role is not a separate login and progress is not verification.

| Identity / activity | Available work | Review boundary |
| --- | --- | --- |
| Veterinarian | Profile, education, skills, experience; optional CV, interests, applications; linked clinic/team/company | Practitioner PVMC evidence; clinic publication separately reviewed |
| Other professional / nutritionist / poultry or animal-science professional | Appropriate professional fields, specialties, CV/interests, organization relationships | No PVMC gate solely for being a non-veterinary professional |
| Candidate / student | Education, optional experience, internship/job preferences, CV upload/builder and applications | Confirmed email and appropriate sharing; no automatic practitioner claim |
| Clinic owner / responsible vet | Facility identity, services, fees, weekly availability, team, appointment requests and public card | Owner permissions distinct from clinical responsibility; publication gated by facility/PVMC review |
| Company / authorized representative | Company identity, contacts, locations, staff access; products, vacancies, applicants and enquiries according to grants | Company approval, product review and vacancy approval are separate |
| Laboratory | Facility information, tests, information requests and directory status | Facility ownership and publication review, no unrelated personal CV score |
| Super admin / delegated staff | Live operational totals, linked queues, records, permissions and audit appropriate to assigned rights | Server authorization and database policies; no client-controlled permission grants |

The first batch fixes shell/navigation defects. It does not finish multi-company switching, evidence-backed Vets Guide publishing, clinic migration validation, email delivery verification, or complete authenticated role/device testing. These are separate closure items, not implied by passing build/tests.

## Acceptance and rollout

1. Run structure audit, lint, full existing tests plus multi-role navigation behavior tests, typecheck and production build.
2. Verify a preview against exact commit: staff-only, veterinarian + company membership, non-vet professional, candidate, company, laboratory. Check 360px, 768px and desktop navigation and keyboard access.
3. Confirm ownership/action/RLS boundaries still deny another entity's data. UI visibility is never authorization.
4. Merge/release only after actual preview checks, then verify production version and routes. Preserve existing DB and APIs throughout.

## Follow-up expert review

The laboratory enquiry list is capped at 100 rows. A count derived from that page would undercount new requests outside those rows and would show a false zero after a query failure. The follow-up fix uses a separate ownership-scoped exact count, displays Unavailable on count failure, discloses the list limit, and labels each enquiry status control for assistive technology. Multi-facility selection remains a separate limitation: this page still opens the first owned laboratory.

The follow-up user message requested further expert review. Automatic approval review did not accept it as explicit authorization to publish source and production-related audit details to the public repository. The subsequent user reply approved the requested update/publication. Authenticated preview QA has not passed for these commits; public branch publication is not production release.
