-- Candidate migration: review against latest main, rehearse in staging. No existing records modified.
begin;
create table public.consultation_settings (
 id boolean primary key default true check (id),
 enabled boolean not null default false,
 provider text not null default 'daily' check (provider in ('daily','none')),
 updated_at timestamptz not null default now()
);
insert into public.consultation_settings(id) values(true);
alter table public.consultation_settings enable row level security;
revoke all on public.consultation_settings from public, anon, authenticated;
grant select, update(enabled,provider) on public.consultation_settings to authenticated;
create policy consultation_settings_admin_read on public.consultation_settings for select to authenticated using ((public.is_super_admin() and public.has_admin_permission('users.manage')));
create policy consultation_settings_admin_write on public.consultation_settings for update to authenticated using ((public.is_super_admin() and public.has_admin_permission('users.manage'))) with check ((public.is_super_admin() and public.has_admin_permission('users.manage')));
create table public.consultation_preferences (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 enabled boolean not null default false,
 availability text not null default 'offline' check (availability in ('available','busy','offline','appointment')),
 audio boolean not null default false,
 video boolean not null default false,
 appointment boolean not null default false,
 heartbeat_at timestamptz,
 updated_at timestamptz not null default now()
);
alter table public.consultation_preferences enable row level security;
revoke all on public.consultation_preferences from public, anon, authenticated;
grant select, insert(user_id,enabled,availability,audio,video,appointment), update(enabled,availability,audio,video,appointment,heartbeat_at) on public.consultation_preferences to authenticated;
create policy consultation_preferences_read on public.consultation_preferences for select to authenticated using (user_id=(select auth.uid()) or (public.is_super_admin() and public.has_admin_permission('users.manage')));
create policy consultation_preferences_insert on public.consultation_preferences for insert to authenticated with check (user_id=(select auth.uid()) and exists(select 1 from public.public_veterinarians v where v.user_id=consultation_preferences.user_id));
create policy consultation_preferences_update on public.consultation_preferences for update to authenticated using (user_id=(select auth.uid()) and exists(select 1 from public.public_veterinarians v where v.user_id=consultation_preferences.user_id)) with check (user_id=(select auth.uid()) and exists(select 1 from public.public_veterinarians v where v.user_id=consultation_preferences.user_id));
-- Never accept client timestamps. Preference changes reset presence; heartbeat-only updates use database clock.
create function public.consultation_stamp_preferences() returns trigger language plpgsql set search_path='' as $$
begin
 new.updated_at:=statement_timestamp();
 if tg_op='INSERT' then new.heartbeat_at:=null;
 elsif not new.enabled or new.availability not in ('available','busy') then new.heartbeat_at:=null;
 elsif row(new.enabled,new.availability,new.audio,new.video,new.appointment) is distinct from row(old.enabled,old.availability,old.audio,old.video,old.appointment) then new.heartbeat_at:=null;
 elsif new.heartbeat_at is distinct from old.heartbeat_at then new.heartbeat_at:=statement_timestamp();
 end if;
 return new;
end $$;
create trigger consultation_preferences_stamp before insert or update on public.consultation_preferences for each row execute function public.consultation_stamp_preferences();
revoke execute on function public.consultation_stamp_preferences() from public,anon,authenticated;
-- Deliberate limited public projection, same eligibility gate as existing public directory.
-- No raw heartbeat, contact data, session credentials, or private user information.
create view public.public_consultation_availability with (security_barrier=true) as
 select p.user_id,p.audio,p.video,p.appointment,
 case when p.availability='appointment' then 'appointment'
 when p.availability in ('available','busy') and p.heartbeat_at > statement_timestamp()-interval '90 seconds' then p.availability
 else 'offline' end as status
 from public.consultation_preferences p join public.public_veterinarians v on v.user_id=p.user_id
 cross join public.consultation_settings s
 where s.id and s.enabled and p.enabled;
revoke all on public.public_consultation_availability from public,anon,authenticated;
grant select on public.public_consultation_availability to anon,authenticated;
commit;
