# VetConnect | Clinic publication and professional credential release gates

**Prepared:** 2 November 2026 (Pakistan)
**Scope:** Draft-only source corrections on top of `main`; no production migration or record changes.

## Updated in this draft

1. Clinic directory and facility detail now label an approved facility as **facility approved / VetConnect-reviewed facility**, rather than implying that the responsible veterinarian's PVMC credential has been verified.
2. The staged migration `20261101162000_separate_clinic_publication_from_registration.sql` keeps company-account approval distinct from clinical publication. A clinic remains private and pending until separate reviewer action, active public services and opening hours, responsible-veterinarian name/PVMC number, and documented human PVMC cross-check.
3. The staged registration review function no longer demands the clinic-owning company's **own** `pvmc_registration` evidence at the organization approval stage. This does not waive the responsible practitioner's clinical publication gate.
4. The PVMC reviewer and facility reviewer need not be the same person, but the dedicated PVMC review evidence, reviewer identity, and date remain mandatory before new publication.
5. New source-level regression checks cover migration boundaries and public labels.

## Important mismatches and deployment blockers

- The **live** `complete_registration_submission()` RPC, the existing registration evidence form and registration evidence requirements still require `pvmc_registration` for company accounts with clinic intent. They must be reconciled together with the staged review RPC before deploying that migration. Do not ship a partial registration contract.
- CNIC number and evidence requirements are still enforced by the current registration form, submission RPC and review RPC. Any change to these identity checks requires a separate product/privacy and applicable-compliance decision **across every dependent layer**. This draft does not bypass or alter the live checks.
- The existing three published clinic rows were not altered; all three had an empty clinic-level `responsible_veterinarian_pvmc` value at the read-only audit snapshot. This is not evidence that their practitioners are unregistered. Require individual authorized reconciliation against evidence and the official register.
- The staged migration protects new publications and re-publications but explicitly does **not** re-approve or unpublish legacy public clinics. A separate legacy audit plan is necessary.
- Admin action code for recording a clinical PVMC cross-check is present, but production lacks the corresponding review columns and publication-readiness trigger. Database and UI changes must be validated as one release.
- Production clinic/public views use elevated view privileges and require separate field/RLS policy review. Do not convert them to `security_invoker` without proving that public directory access still works and no private data leaks.
- Career alert delivery is not proven. The two pending notifications had zero attempts and the central Vercel project lacked essential protected environment-variable keys at audit time. No email, queue replay or secret changes are included here.
- PR #63 still requires integration with current `main` and authenticated desktop/mobile QA.
- Vercel's custom-domain production alias was still on an older commit than merged PR #65 at audit time. GitHub merge or successful preview is not a production release.

## Required verification before merge/deploy

- Run repository audit, lint, source tests, TypeScript, production build, and dependency audit.
- Run isolated PostgreSQL tests for clinic draft, review, publish, unpublish, republish, PVMC reviewer proof and tampering; prove that the ordinary company registration approval never publishes clinical services.
- Reconcile both registration RPCs, actual form requirements, upload validation, private bucket policies, and reviewer permissions before applying any schema migration.
- Verify existing published clinics individually without fabricating or automatically approving credentials.
- Test company owner, unrelated company member, veterinarian, non-vet professional, clinic reviewer and delegated staff; include cross-entity denial and 360px/768px/desktop visual/keyboard checks.
- Only release to production project `vetconnect` after compatible staging QA and deployment quota recovery. Compare exact deployed SHA to the custom-domain alias and keep rollback ready.

**Current label:** Source remediation prepared in a draft branch. Not ready for database migration, live release, blanket PVMC approval or production certification.
