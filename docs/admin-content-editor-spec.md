# Editable public information: owner brief and delivery boundary

Status: implementation specification, NOT an active admin editor.

The owner requests later editing of About, Team, Terms, Privacy, Cookies and their SEO text through Admin. Public copy is revised in this PR. The current pages still read the versioned source file; there is no save/publish backend in this PR.

## Proposed permissions
- site_content.edit: create and edit private drafts, edit SEO title/description, view rendered preview and request review.
- site_content.publish: approve and publish an exact saved revision; restore an earlier revision by creating a new publish event.
- Assign the publisher permission to the owner/super-admin initially. Assign editing only to explicitly selected staff. Do not grant account access from a person’s public team listing.
- Extend the existing per-user grant/revocation system. Enforce effective permissions in server actions AND database policies; revoked grants and lookup errors must deny writes.

## Minimum workflow
Admin > Website pages > choose page > Edit draft > Preview > Publish reviewed revision.
Public visitors see only the published revision. Saving a draft never changes the public page. Preserve title, subtitle, plain-text sections, approved links, SEO title/description, version, publication date and editor. Validate lengths and allowlisted route names; reject executable HTML, javascript: URLs, arbitrary canonical domains and private document links.
Show current published and draft revision numbers. Use expected-version checks to prevent two editors overwriting one another. Record author, approver, timestamp, changed fields and reason; keep immutable revisions and audit entries. Restore creates a new version rather than erasing history.
Publishing policy changes does not retrospectively record consent. Material changes need a separate notice/renewed-agreement assessment.

## Implementation prerequisites and acceptance
Prepare compatible content/revision/audit tables in an isolated staging database, migrations and RLS. No production database mutation is included or implied by this specification.
Verify anonymous and ordinary users cannot read drafts or write content; editor cannot publish; publisher can approve; revoked and suspended staff cannot write; failed authorization lookups deny access; stale revisions reject; history and restore work.
Public metadata must use the published text with the existing canonical-domain helper. SEO fields must not expose private data. Any cache invalidation must follow successful publication; backend failure must retain the last known published content.
Keep Team profiles private until names, roles, biographies and publication permission are confirmed.
Do not claim admin editing is usable until migration, authenticated permission tests and browser QA have passed.

## Product and privacy scope agreed in the owner brief
Core: PVMC-registered veterinarian discovery and farmer/pet-owner connections.
Allied identities: qualifications, experience, professional profile information.
Business: relevant company/service-provider connections and source-backed product references (brand/generic, ingredients/salts, strength, form, packaging, manufacturer/supplier, review scope and source date).
Careers: vacancies linked to identifiable employers and sources, with truthful review labels.
Learning: knowledge sharing, training, online courses and skill development; actual enrolment/completion availability must be stated.
Roadmap: animal/herd identity, consultations, clinician-authored prescriptions, treatment/vaccination history and owner-authorised care-team access. The current repository README and roadmap identify complete clinical-record/prescription workflows as outstanding; do not publish them as operational.

VNV relationship is described as the owner's digital initiative, without asserting a separate incorporated subsidiary. Official NIC Faisalabad sources confirm Vet-Connect Cohort 3 and Muhammad Atif Naseem as Founder. NICF's own About page describes Ministry of IT & Telecom / Ignite funding. This does not imply official product or practitioner approval.
No independent comparative evidence was found to substantiate an absolute Pakistan’s first claim; use an integrated platform for Pakistan.

Sources checked 1 November 2026:
- https://www.nicfaisalabad.com/startup/vet-connect/
- https://www.nicfaisalabad.com/about-us/
- Repository README.md, docs/ROADMAP-GAP-MATRIX.md and app/learn/page.tsx.
