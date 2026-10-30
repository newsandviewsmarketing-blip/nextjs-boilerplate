# VetConnect Phase 1: security and permissions (draft)

Base: PR #36 (aa328dfefe5cf4c8749d6625e38e4cd621f63d5d), including PR #34, with no merge or release.

## Application changes
- Effective admin permissions: role grants, individual grants and revocations evaluated together; lookup errors deny access.
- Admin review mutations, navigation, overview and review screen use effective privileges.
- Assisted-entry veterinarians always start unpublished with pending profile and PVMC review, irrespective of the checkbox or supplied PVMC number. Approved allied professionals retain authorized immediate publication.
- Structural regression tests cover these invariants.

## Live Supabase security audit findings (26 October 2026)
The production database has NOT been changed by this PR.
- Nine security-definer public views are flagged. Review public contact-field exposure and underlying table RLS before enabling `security_invoker`. Switching immediately could break public directories without explicit grants/policies.
- Thirty-six security-definer functions executable by `anon`, also flagged for authenticated role. Triage every function by purpose and current RLS caller dependencies. Do not mass-revoke: permission helpers, trigger functions and RPCs have different requirements.
- One mutable search_path function, `public.set_updated_at`. Pin its schema-qualified search_path after assessing dependencies.
- `guest_job_applications` has RLS with no policies. Login-only guest flow is intentionally locked down; do not add public policies.
- Leaked-password protection is a Supabase Auth configuration review item.
- Performance: 86 missing-FK-index advisories, 7 RLS auth initplan advisories, 51 multiple permissive policies, 1 duplicate job index. Measure query load before changing.

## Prerequisites before production
1. Owner-reviewed database remediation plan with safe migrations, rollback strategy, and real-role RLS/authorization tests in staging.
2. Authenticated staging tests for restricted admin, role-grant override, role-revoked override, and DB-read failures.
3. Vet profile and PVMC workflows tested with real permission accounts.
4. Full CI with Node 24, npm security audit, lint, typecheck and build.
5. Independent review, explicit production approval, release gate. Never merge this draft directly.
