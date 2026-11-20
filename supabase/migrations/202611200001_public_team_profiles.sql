-- Public editorial team directory, separate from staff login roles.
create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(full_name) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  job_title text not null check (char_length(job_title) between 2 and 120),
  department text not null default '',
  summary text not null default '',
  biography text not null default '',
  expertise text not null default '',
  qualifications text not null default '',
  photo_path text,
  linkedin_url text,
  email_public text,
  sort_order integer not null default 100,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint team_summary_limit check (char_length(summary) <= 500),
  constraint team_bio_limit check (char_length(biography) <= 8000)
);
create index if not exists team_members_published_order on public.team_members (is_published,sort_order,full_name);
alter table public.team_members enable row level security;
-- API grants and RLS are independent: grant only the minimum required operations.
grant select on public.team_members to anon;
grant select, insert, update, delete on public.team_members to authenticated;
drop policy if exists team_members_public_read on public.team_members;
create policy team_members_public_read on public.team_members for select to anon, authenticated
using (is_published or (select public.has_admin_permission('site.manage')));
drop policy if exists team_members_admin_insert on public.team_members;
create policy team_members_admin_insert on public.team_members for insert to authenticated
with check ((select public.has_admin_permission('site.manage')));
drop policy if exists team_members_admin_update on public.team_members;
create policy team_members_admin_update on public.team_members for update to authenticated
using ((select public.has_admin_permission('site.manage')))
with check ((select public.has_admin_permission('site.manage')));
drop policy if exists team_members_admin_delete on public.team_members;
create policy team_members_admin_delete on public.team_members for delete to authenticated
using ((select public.has_admin_permission('site.manage')));
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('team-photos','team-photos',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=true,file_size_limit=5242880,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists team_photos_public_read on storage.objects;
create policy team_photos_public_read on storage.objects for select to anon, authenticated
using (bucket_id='team-photos');
drop policy if exists team_photos_admin_insert on storage.objects;
create policy team_photos_admin_insert on storage.objects for insert to authenticated
with check (bucket_id='team-photos' and (select public.has_admin_permission('site.manage')));
drop policy if exists team_photos_admin_delete on storage.objects;
create policy team_photos_admin_delete on storage.objects for delete to authenticated
using (bucket_id='team-photos' and (select public.has_admin_permission('site.manage')));
