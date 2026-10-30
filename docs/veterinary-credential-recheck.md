# Veterinary registration category and PVMC evidence quality (draft)

## Observations, 26 October 2026
- Supabase veterinarian_profiles: 9 records, 8 approved profile + PVMC status, 4 PVMC-approved without PVMC number, 5 approved credentials missing either PVMC number or text evidence of DVM/BVSc qualification.
- A case with Intermediate listed as qualification, and Dairy Nutrition listed as specialization, was marked veterinarian profile APPROVED and PVMC APPROVED, even though no PVMC number, formal professional credential documents or reviewer source notes were stored.
- Approval audit entries exist. Missing evidence is not conclusive proof of misconduct; request correction and PVMC verification.
- Public veterinarian directory database views use raw approved flags and return pvmc_verified=true without checking registration numbers or evidence.

## Implemented in this draft
- Registration role must be deliberately chosen; Veterinary Student/Job Seeker and Allied Industry Professional presented separately from Registered Veterinarian.
- Reviewer approval of new veterinary profile requires qualification text indicating a DVM/BVSc veterinary degree, allowing further official review for equivalent qualifications.
- Reviewer approval of PVMC credential requires profile already approved, a nonblank registration number, qualifying veterinary degree text, and at least 25 characters of PVMC verification notes. **Still manual, not verified against regulator API.**
- Admin overview PVMC data recheck count, separate case queue, Users/dossier warnings.
- Authorized super administrator can reopen a pre-existing inconsistent approved credential to PENDING (after adding 25-character reason), creating verification record and audit entries. No automatic denial or suspension of any user, no database changes made.
- Test suite and Node 24 trial workflow.

## Still required before release
1. Independent PVMC register search, official valid professional registration class, expiry/renewal and approved DVM or legally recognized equivalent.
2. An official evidence attachment or verifiable reference and audit timestamp should become **mandatory** on a future regulated verification schema.
3. Carefully designed, reviewed Supabase migration to prevent legacy APPROVED records with missing core evidence from appearing as verified to public visitors. A DB view that unconditionally labels approved rows pvmc_verified=true is insufficient.
4. Revalidate professionally authorized DVM/BVSc qualifications and accepted alternate registration categories with PVMC policy experts.
5. Reconcile existing 5 flagged records individually, contact account holders, record reviewer reason, do not automatically suspend or falsely accuse.
6. Authenticated RBAC, RLS and staging-database testing; preview may share production Supabase. Do not trial approvals on the preview until fully isolated.

No production merge, SQL migration, live-user change or deployment performed.
