# VetConnect Phase 4: First Steps

This package upgrades the latest supplied Phase 3 source. It does not replace your Supabase project, Vercel project or domain.

1. Back up the current Supabase database and production source.
2. Create a `vetconnect-phase-4` branch in the existing repository.
3. Copy this package into that branch without uploading the ZIP, `node_modules`, `.next` or `.env.local`.
4. Run `supabase/migrations/202608170001_phase4_admin_control.sql` in the existing Supabase SQL Editor.
5. Deploy the branch to the existing Vercel Preview environment.
6. Test every administrator role and the complete product lifecycle before merging to `main`.

Detailed setup: `docs/PHASE4-SETUP.md`

Release checklist: `docs/PHASE4-RELEASE-CHECKLIST.md`
