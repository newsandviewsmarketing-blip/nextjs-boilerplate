-- Candidate-owned recruitment follow-up notes. No automatic tracking of external calls or messages.
-- Separate from employer-controlled application status and private CV access.
create table if not exists public.job_application_activity (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.job_applications(id) on delete cascade,
  candidate_user_id uuid not null references auth.users(id) on delete cascade,
  activity_type text not null check (activity_type in ('phone_call','message','interview','follow_up','note')),
  direction text not null default 'received' check (direction in ('received','sent','not_applicable')),
  occurred_at timestamptz not null default now(),
  details text not null check (char_length(details) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists job_application_activity_candidate_idx
  on public.job_application_activity(candidate_user_id,occurred_at desc);
create index if not exists job_application_activity_application_idx
  on public.job_application_activity(application_id,occurred_at desc);
alter table public.job_application_activity enable row level security;
revoke all on public.job_application_activity from anon;
grant select,insert on public.job_application_activity to authenticated;
create policy "activity_candidate_read" on public.job_application_activity
  for select to authenticated
  using (candidate_user_id=(select auth.uid())
    and exists (select 1 from public.job_applications a where a.id=application_id
      and a.candidate_user_id=(select auth.uid())));
create policy "activity_candidate_add" on public.job_application_activity
  for insert to authenticated
  with check (candidate_user_id=(select auth.uid())
    and exists (select 1 from public.job_applications a where a.id=application_id
      and a.candidate_user_id=(select auth.uid())));
-- Append-only: records cannot be edited or deleted through client API.
