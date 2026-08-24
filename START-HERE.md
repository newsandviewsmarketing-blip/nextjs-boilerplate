# VetConnect Consolidated Release Candidate — Start Here

**Release candidate date:** 24 August 2026

This package consolidates the latest corrected Phase 3 baseline and Phase 4 administrator-control upgrade, then adds release-safety, SEO/indexing and auditability improvements. It is designed for a **feature-branch + Vercel Preview** workflow, not a blind overwrite of production.

## What the latest screenshots show

- GitHub `main` visibly identifies itself as **VetConnect Pakistan Backend Phase 2**.
- Supabase is Healthy, but its dashboard shows **No migrations** and **No backups** in the displayed migration/backup panels.
- Vercel contains multiple projects tied to the same repository, including `vetconnect` and several `nextjs-boilerplate*` projects.

Because of that state, **do not run Phase 3/4 SQL based only on filenames and do not push this package straight to `main`.**

## Safe first actions

1. Identify the single Vercel project that owns `www.vetconnect.com.pk`.
2. Run `supabase/preflight/20260824_read_only_preflight.sql` in Supabase SQL Editor.
3. Save the preflight results and current row counts.
4. Create Git branch `vetconnect-consolidated-rc` from the current production/main baseline.
5. Copy the **contents** of this folder into that branch. Do not commit the ZIP itself.
6. Run local checks with Node.js 22+.
7. Apply only database migrations proven missing by the preflight, in filename order, in Preview/staging first.
8. Deploy the branch to Vercel Preview.
9. Complete admin-role, moderation, mobile, SEO and editorial checks.
10. Merge to `main` only after sign-off.

## Essential documents

- `docs/DEPLOYMENT-STATE-2026-08-24.md`
- `docs/FINAL-RELEASE-RUNBOOK.md`
- `docs/EDITORIAL-AND-ADMIN-ACCOUNTABILITY.md`
- `docs/SEO-AND-INDEXING-RELEASE-CHECKLIST.md`
- `docs/ROADMAP-GAP-MATRIX.md`
- `docs/PHASE3-RELEASE-CHECKLIST.md`
- `docs/PHASE4-RELEASE-CHECKLIST.md`

## Audit commands

```bash
npm ci
npm run audit
npm test
npm run lint
npm run typecheck
npm run build
npm run release:gate
npm run release:manifest
```

`RELEASE-MANIFEST.json` records SHA-256 hashes for the package files so the release contents can be audited before and after copying.
