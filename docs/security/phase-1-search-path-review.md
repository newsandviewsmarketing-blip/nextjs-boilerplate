# Phase 1: set_updated_at search path

Draft only; do not execute against production. Read-only inspection found a SECURITY INVOKER trigger function with no configured search path, using only NEW.updated_at and now(), attached to 43 triggers.

Proposed staging SQL (not an automatically applied migration):

```sql
ALTER FUNCTION public.set_updated_at() SET search_path = pg_catalog, pg_temp;
```

Rollback (only if the original configuration remains unset):

```sql
ALTER FUNCTION public.set_updated_at() RESET search_path;
```

Acceptance: capture function definition and trigger count before/after; verify only search_path changes, all triggers remain attached, representative synthetic updates refresh updated_at, role permissions remain unchanged, and advisor warning disappears. Run registration, jobs, clinics and booking regression tests in isolated staging. No production application or merge without explicit exact-release approval. Generate a migration using Supabase CLI after staging validation.
