-- VetConnect Pakistan Phase 3 role expansion.
-- Run this migration by itself before 202608110002_phase3_foundation.sql.
-- PostgreSQL requires newly added enum values to be committed before use.

begin;

alter type public.account_role add value if not exists 'verification_officer';
alter type public.account_role add value if not exists 'content_admin';
alter type public.account_role add value if not exists 'analyst';
alter type public.account_role add value if not exists 'professional';
alter type public.account_role add value if not exists 'laboratory';

commit;
