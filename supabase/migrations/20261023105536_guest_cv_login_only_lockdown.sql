begin;
-- The product no longer supports anonymous CV submissions or guest verification.
-- Preserve experimental rows solely for migration and audit history.
drop policy if exists guest_submitted_employer_read on public.guest_job_applications;
revoke all on public.guest_job_applications from anon, authenticated;
-- The guest CV bucket remains private, with no public or authenticated object access policy.
update storage.buckets set public=false where id='guest-job-cvs';
commit;