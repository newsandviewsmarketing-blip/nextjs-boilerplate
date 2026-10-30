-- Preserve the submitted category form as private, reviewable data.
-- Users can edit this draft only before submission or after a rejection.
create table if not exists public.registration_profile_details (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  category_details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.registration_profile_details enable row level security;

drop policy if exists registration_details_owner_or_reviewer_select
  on public.registration_profile_details;
create policy registration_details_owner_or_reviewer_select
  on public.registration_profile_details
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.has_admin_permission('profiles.review')
  );

drop policy if exists registration_details_owner_draft_insert
  on public.registration_profile_details;
create policy registration_details_owner_draft_insert
  on public.registration_profile_details
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.registration_completion_gate g
      where g.user_id = (select auth.uid())
        and (g.completed_at is null or g.review_status = 'rejected')
    )
  );

drop policy if exists registration_details_owner_draft_update
  on public.registration_profile_details;
create policy registration_details_owner_draft_update
  on public.registration_profile_details
  for update to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.registration_completion_gate g
      where g.user_id = (select auth.uid())
        and (g.completed_at is null or g.review_status = 'rejected')
    )
  )
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.registration_completion_gate g
      where g.user_id = (select auth.uid())
        and (g.completed_at is null or g.review_status = 'rejected')
    )
  );

grant select, insert, update
  on public.registration_profile_details to authenticated;
revoke delete on public.registration_profile_details from authenticated;

drop trigger if exists registration_profile_details_set_updated_at
  on public.registration_profile_details;
create trigger registration_profile_details_set_updated_at
  before update on public.registration_profile_details
  for each row execute function public.set_updated_at();

comment on table public.registration_profile_details is
  'Private category-specific registration data retained for reviewers and draft resumption.';
