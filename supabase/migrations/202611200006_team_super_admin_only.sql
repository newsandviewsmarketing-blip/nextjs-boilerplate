-- Team portfolios may be managed only by active Super Administrators.
-- Retain public select for published team profiles.
drop policy if exists team_members_admin_read on public.team_members;
create policy team_members_admin_read on public.team_members for select to authenticated
using ((select public.is_super_admin(auth.uid())) and (select public.has_admin_permission('site.manage')));
drop policy if exists team_members_admin_insert on public.team_members;
create policy team_members_admin_insert on public.team_members for insert to authenticated
with check ((select public.is_super_admin(auth.uid())) and (select public.has_admin_permission('site.manage')));
drop policy if exists team_members_admin_update on public.team_members;
create policy team_members_admin_update on public.team_members for update to authenticated
using ((select public.is_super_admin(auth.uid())) and (select public.has_admin_permission('site.manage')))
with check ((select public.is_super_admin(auth.uid())) and (select public.has_admin_permission('site.manage')));
drop policy if exists team_members_admin_delete on public.team_members;
create policy team_members_admin_delete on public.team_members for delete to authenticated
using ((select public.is_super_admin(auth.uid())) and (select public.has_admin_permission('site.manage')));
drop policy if exists team_photos_admin_insert on storage.objects;
create policy team_photos_admin_insert on storage.objects for insert to authenticated
with check (bucket_id='team-photos' and (select public.is_super_admin(auth.uid())) and (select public.has_admin_permission('site.manage')));
drop policy if exists team_photos_admin_delete on storage.objects;
create policy team_photos_admin_delete on storage.objects for delete to authenticated
using (bucket_id='team-photos' and (select public.is_super_admin(auth.uid())) and (select public.has_admin_permission('site.manage')));
