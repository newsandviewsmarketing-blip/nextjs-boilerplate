# VetConnect Admin Control v2: consolidation and canonical-data design

Status: Draft design implementation, 2 November 2026. No live data or permissions modified.

## Information architecture
- One public top navigation only for the public website. Authenticated admin workspace retains one admin menu on the left and one operational content area on the right.
- Sidebar groups: Dashboard; Registrations & People; Clinics & Diagnostics; Marketplace & Companies; Jobs & HR; Approvals; Governance & Data. Show permission-filtered links only; do not offer nonexistent review history. PVMC is an element of veterinary credential review, not a standalone business sector.
- Right side: always-visible subject-level totals and Approved/Pending/Rejected/New 24h figures first, pending review queues second, latest updates and decisions third, rolling operational activity next. Figures link to their existing authorized record pages; no hidden master statistics.
- Each item opens the canonical existing action page; no duplicated review forms or autonomous approvals.
- Profile progress is not licence, clinic, company, medicine, or publication approval. Store/label each independently. Source verification_status=approved is not a publication decision and does not imply PVMC credential approval. 'New 24h' is a time window, independent of status. Candidate accounts by primary_role are not the total number of job seekers or job applicants.
- Mobile: admin sidebar unfolds in a disclosure; main content is a single column, no second horizontal-scrolling navigator.

## Role distinctions
| Role | Main concerns | Approval boundary |
| --- | --- | --- |
| Veterinarian | Personal profile, PVMC evidence, CV, linked clinics, professional activity | PVMC and clinical publication each separate |
| Professional / job seeker | Profile, career interests, CV, applications | Can save privately without clinician approval |
| Clinic | Identity, responsible vet, services, fees, hours, team, appointment requests | Admin facility publication approval |
| Company | Company identity, product submissions, jobs, staff permissions | Company verification and item review separate |
| Admin | Permission-gated review queue, data governance, audit/export | No bulk approval shortcut |

## Master data: reuse before expansion
The repository already has `master_data_items` and `master_data_suggestions`, reviewed by `master_data.manage`. Start by measuring and consolidating them, NOT by adding a second taxonomy database.
- Canonical institutions must have an approved ID, one exact display name and a controlled category. DVM institution source is PVMC recognized list; awarding institution and affiliated campus must not be conflated.
- Approved aliases reference a canonical ID. Example: UAF → University of Agriculture Faisalabad; UVAS → University of Veterinary and Animal Sciences Lahore. These are different universities and MUST NEVER merge. 'UF' and ambiguous abbreviations require review.
- Skills: 'Microbio' may suggest Microbiology, but suggestion is not automatic identity. Source form preserves entered text pending approval. Display the approved spelling when selected.
- Search is incremental (case-insensitive prefix + token/fuzzy suggestion), returning approved matches first. Distinguish a suggested correction from approved exact match. Do not auto-save or silently merge uncertain values.
- Suggestions queue includes category, original spelling, province/campus context where applicable, suggested canonical ID, match confidence, submitted by, reviewer, status, decision timestamp and audit note.
- Admin review actions should choose **map to existing**, **approve new**, **request clarification**, **reject**; guard conflicts and normalized aliases with unique constraints after staging tests.
- Existing forms and CSVs should consume canonical IDs while retaining raw user input in a separate field for traceability. Migrate historical records only in a versioned, reversible batch with audit.
- No automatic PVMC verification via scraping or guessed API; keep independently reviewed evidence.

## Export rules (existing + planned)
- Current authorized Admin Reports already supports limited CSV and print. Do not confuse that export with a new data export pipeline.
- Plan role-scoped canonical master-data CSV: `canonical_id, category, label, aliases, context, status, reviewed_at`, with UTF-8, spreadsheet formula-injection prevention, permission check, audit and row-count limits.
- PDF is a presentation of saved, permission-filtered records (CV/report), not another source of truth. Include generated date, data status and source reference, never imply personal CV is officially licensed.
- Source records remain Supabase; CSV/PDF are outputs, not independent replicated datasets. No new export endpoints until privacy/security scope review.

## Stop conditions and quality gates
- No changes to production database, approval rules, account roles, merge to main, or live deployment in this design PR.
- Validate current route targets and each click against permission checks. Make page layout consistent but keep distinct forms according to role.
- Test desktop/mobile layout at 360, 768 and 1280 pixels; real-account admin review, screen reader/keyboard, pagination, exact CI head, rate-limit and production data safety.
- Separate unresolved launch blocker: live `review_registration_submission` clinic-publication coupling. Fix and stage-test this before a broader clinic release.