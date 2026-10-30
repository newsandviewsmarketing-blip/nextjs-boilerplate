# VetConnect Phase 2 (draft)

## Implemented
- Permission-scoped dashboard KPI links, record search and latest registrations/reviews.
- Deep links to pending veterinarian, professional, firm, clinic, laboratory and product approvals.
- Grouped left navigation, responsive design, company and personal workspace shortcuts.
- Audit report print page and authorized CSV export, with formula-injection protection and no-store headers.
- Applications register and private dashboard noindex metadata.

## Remaining release gates
- Node 24 GitHub Actions, actual browser UI QA, role-permission and authenticated RLS E2E.
- Verify each dashboard metric and its target with staging users and real approval states.
- "Recent activity" is refresh-based rather than realtime; only a bounded sample.
- Newcomers, shops and medicine-test orders require dedicated source models before independent counts.
- Printed audit is newest 500; CSV newest 2000. Pagination and archival requirements need separate review.
- Existing list pages have finite limits. Add controlled server pagination before enterprise-scale use.
- No main merge, production deploy, SQL updates, live data or DNS changes.
