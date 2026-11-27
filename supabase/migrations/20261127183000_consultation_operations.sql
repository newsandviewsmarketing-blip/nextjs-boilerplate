begin;
alter table public.consultation_preferences add column fee_pkr numeric(10,2) check (fee_pkr between 0 and 99999999.99);
grant insert(fee_pkr),update(user_id,fee_pkr) on public.consultation_preferences to authenticated;
create or replace view public.public_consultation_availability with (security_barrier=true) as
select p.user_id,p.audio,p.video,p.appointment,
 case when p.availability='appointment' then 'appointment'
 when p.availability in ('available','busy') and p.heartbeat_at > statement_timestamp()-interval '90 seconds' then p.availability
 else 'offline' end as status,p.fee_pkr
from public.consultation_preferences p join public.public_veterinarians v using(user_id)
join public.profiles profile on profile.id=p.user_id and profile.account_status='active'
cross join public.consultation_settings s where s.id and s.enabled and p.enabled;

-- Out-of-band staging authorization. Client roles cannot set budgets or enroll accounts.
create table public.consultation_test_accounts(user_id uuid primary key references public.profiles);
create table public.consultation_months(
 month_start date primary key check(extract(day from month_start)=1),
 limit_minutes integer not null check(limit_minutes>=0),
 reserved_minutes integer not null default 0 check(reserved_minutes>=0),
 used_minutes integer not null default 0 check(used_minutes>=0)
);
create table public.consultation_sessions(
 id uuid primary key default gen_random_uuid(),
 requester uuid not null references public.profiles,
 veterinarian uuid not null references public.profiles,
 appointment_id uuid references public.clinic_appointment_requests(id),
 mode text not null check(mode in ('audio','video')),
 state text not null default 'requested' check(state in ('requested','provisioning','ready','completed','declined','cancelled','expired','failed')),
 requested_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '90 seconds',
 accepted_at timestamptz, ended_at timestamptz, duration_seconds integer, measured_minutes integer,
 reservation_month date references public.consultation_months,
 reserved_minutes integer not null default 0 check(reserved_minutes>=0),
 check(requester<>veterinarian)
);
create index consultation_incoming on public.consultation_sessions(veterinarian,requested_at desc);
create index consultation_outgoing on public.consultation_sessions(requester,requested_at desc);
alter table public.consultation_sessions enable row level security;
alter table public.consultation_months enable row level security;
alter table public.consultation_test_accounts enable row level security;
revoke all on public.consultation_sessions,public.consultation_months,public.consultation_test_accounts from public, anon, authenticated;
grant select on public.consultation_sessions to authenticated;
create policy consultation_participant_history on public.consultation_sessions for select to authenticated using
 ((select auth.uid()) in (requester,veterinarian) and exists(select 1 from public.profiles where id=(select auth.uid()) and account_status='active'));

create function public.consultation_test_allowed(person uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.consultation_test_accounts a join public.profiles p on p.id=a.user_id where a.user_id=person and p.account_status='active')
$$;
revoke all on function public.consultation_test_allowed(uuid) from public,anon,authenticated;

-- Owner-operated clinics only. Other staffing models require an explicit clinician assignment.
create view public.consultation_appointments with(security_barrier=true) as
select a.id,a.requester_id,c.owner_id as veterinarian,
 (a.scheduled_date+a.scheduled_time) at time zone 'Asia/Karachi' as starts_at,
 ((a.scheduled_date+a.scheduled_time) at time zone 'Asia/Karachi') + make_interval(mins=>cs.duration_minutes) as ends_at
from public.clinic_appointment_requests a
join public.clinics c on c.id=a.clinic_id
join public.service_catalog sc on sc.id=a.service_id and sc.is_active and sc.slug='tele-veterinary-consultation'
join public.clinic_services cs on cs.clinic_id=c.id and cs.service_id=sc.id and cs.is_active and cs.is_public and cs.booking_enabled
join public.public_consultation_availability v on v.user_id=c.owner_id and v.appointment
where auth.uid() in (a.requester_id,c.owner_id) and a.status='scheduled' and cs.duration_minutes>0;
revoke all on public.consultation_appointments from public,anon,authenticated;
grant select on public.consultation_appointments to authenticated;

create function public.consultation_request(vet uuid, requested_mode text, booking uuid default null) returns uuid language plpgsql security definer set search_path='' as $$
declare caller uuid:=auth.uid(); session_id uuid;
begin
 if caller=vet or requested_mode is null or requested_mode not in ('audio','video') or not public.consultation_test_allowed(caller) or not public.consultation_test_allowed(vet) then raise exception 'Unavailable'; end if;
 -- Consistent lock order across both roles prevents overlapping incoming and outgoing sessions.
 perform id from public.profiles where id in (caller,vet) order by id for update;
 if booking is not null and not exists(select 1 from public.consultation_appointments where id=booking and requester_id=caller and veterinarian=vet and now() between starts_at and ends_at-interval '10 minutes') then raise exception 'Appointment unavailable'; end if;
 if not exists(select 1 from public.public_consultation_availability where user_id=vet and (status='available' or booking is not null and status='appointment') and case requested_mode when 'audio' then audio else video end)
 or not exists(select 1 from public.consultation_settings where enabled and provider='daily') then raise exception 'Unavailable'; end if;
 if exists(select 1 from public.consultation_sessions where state in ('requested','provisioning','ready') and expires_at>clock_timestamp() and (requester in (caller,vet) or veterinarian in (caller,vet))) then raise exception 'Participant busy'; end if;
 insert into public.consultation_sessions(requester,veterinarian,mode,appointment_id) values(caller,vet,requested_mode,booking) returning id into session_id;
 return session_id;
end $$;

create function public.consultation_respond(session_id uuid, decision text) returns void language plpgsql security definer set search_path='' as $$
declare s public.consultation_sessions; period date; deadline timestamptz:=clock_timestamp()+interval '10 minutes';
begin
 select * into s from public.consultation_sessions where id=session_id for update;
 if not found or s.state<>'requested' or s.expires_at<=clock_timestamp() or not public.consultation_test_allowed(auth.uid()) then raise exception 'Unavailable'; end if;
 if decision='cancel' and auth.uid()=s.requester or decision='decline' and auth.uid()=s.veterinarian then
 update public.consultation_sessions set state=case decision when 'cancel' then 'cancelled' else 'declined' end,ended_at=now() where id=s.id; return;
 end if;
 if decision is distinct from 'accept' or auth.uid()<>s.veterinarian or not public.consultation_test_allowed(s.requester)
 or not exists(select 1 from public.public_consultation_availability where user_id=s.veterinarian and (status='available' or s.appointment_id is not null and status='appointment') and case s.mode when 'audio' then audio else video end)
 or not exists(select 1 from public.consultation_settings where enabled and provider='daily') then raise exception 'Unavailable'; end if;
 if s.appointment_id is not null and not exists(select 1 from public.consultation_appointments where id=s.appointment_id and veterinarian=s.veterinarian and requester_id=s.requester and now()>=starts_at and deadline<=ends_at) then raise exception 'Appointment unavailable'; end if;
 period:=date_trunc('month',now() at time zone 'UTC')::date;
 if date_trunc('month',deadline at time zone 'UTC')::date<>period then raise exception 'Budget period closing'; end if;
 update public.consultation_months set reserved_minutes=reserved_minutes+20 where month_start=period and limit_minutes-used_minutes-reserved_minutes>=20;
 if not found then raise exception 'Budget unavailable'; end if;
 update public.consultation_sessions set state='provisioning',accepted_at=now(),expires_at=deadline,reservation_month=period,reserved_minutes=20 where id=s.id;
end $$;
revoke all on function public.consultation_request(uuid,text,uuid),public.consultation_respond(uuid,text) from public,anon,authenticated;
grant execute on function public.consultation_request(uuid,text,uuid),public.consultation_respond(uuid,text) to authenticated;
create function public.consultation_joinable(session_id uuid) returns table (id uuid,mode text,expires_at timestamptz) language sql stable security definer set search_path='' as $$
 select s.id,s.mode,s.expires_at from public.consultation_sessions s
 join public.consultation_settings config on config.id and config.enabled and config.provider='daily'
 join public.public_consultation_availability p on p.user_id=s.veterinarian
 where s.id=session_id and auth.uid() in (s.requester,s.veterinarian)
 and public.consultation_test_allowed(s.requester) and public.consultation_test_allowed(s.veterinarian)
 and (s.appointment_id is null or exists(select 1 from public.consultation_appointments a where a.id=s.appointment_id and a.requester_id=s.requester and a.veterinarian=s.veterinarian and now() between a.starts_at and a.ends_at))
 and s.state='ready' and s.expires_at>now() and case s.mode when 'audio' then p.audio else p.video end
$$;
revoke all on function public.consultation_joinable(uuid) from public,anon;
grant execute on function public.consultation_joinable(uuid) to authenticated;
grant select, update(state,ended_at) on public.consultation_sessions to service_role;
create policy consultation_budget_read on public.consultation_months for select to authenticated using (public.is_super_admin() and public.has_admin_permission('users.manage'));
grant select on public.consultation_months to authenticated;
create table public.consultation_settings_audit (
 id bigint generated always as identity primary key, actor uuid references public.profiles,
 changed_at timestamptz not null default now(), enabled boolean not null, provider text not null
);
alter table public.consultation_settings_audit enable row level security;
revoke all on public.consultation_settings_audit from public,anon,authenticated;
grant select on public.consultation_settings_audit to authenticated;
create policy consultation_settings_log_admin on public.consultation_settings_audit for select to authenticated using(public.is_super_admin() and public.has_admin_permission('users.manage'));
create function public.consultation_audit_settings() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.consultation_settings_audit(actor,enabled,provider) values(auth.uid(),new.enabled,new.provider);
 return new;
end $$;
revoke all on function public.consultation_audit_settings() from public,anon,authenticated;
create trigger consultation_settings_log after update on public.consultation_settings for each row
 when(old.enabled is distinct from new.enabled or old.provider is distinct from new.provider)
 execute function public.consultation_audit_settings();
create function public.consultation_report(first_day date,last_day date)
returns table(day date,mode text,outcome text,sessions bigint)
language plpgsql stable security definer set search_path='' as $$
begin
 if not (public.is_super_admin() and public.has_admin_permission('users.manage') and exists(select 1 from public.profiles where id=auth.uid() and account_status='active'))
 or first_day is null or last_day is null or last_day-first_day not between 0 and 92 then raise exception 'Report unavailable'; end if;
 return query select (s.requested_at at time zone 'Asia/Karachi')::date,s.mode,
 case when s.expires_at<=now() and s.state='requested' then 'missed'
 when s.expires_at<=now() and s.state in ('provisioning','ready') then 'expired' else s.state end,count(*)
 from public.consultation_sessions s
 where s.requested_at>=first_day::timestamp at time zone 'Asia/Karachi' and s.requested_at<(last_day+1)::timestamp at time zone 'Asia/Karachi'
 group by 1,2,3 order by 1 desc,2,3;
end $$;
revoke all on function public.consultation_report(date,date) from public,anon;
grant execute on function public.consultation_report(date,date) to authenticated;
create view public.consultation_history with(security_invoker=true) as
select id, requester, veterinarian, mode, requested_at,expires_at,
case when expires_at<=now() and state='requested' then 'missed'
when expires_at<=now() and state in ('provisioning','ready') then 'expired' else state end as state,duration_seconds
from public.consultation_sessions;
revoke all on public.consultation_history from public,anon,authenticated;
grant select on public.consultation_history to authenticated;
create function public.consultation_settle(session_id uuid,minutes integer,seconds integer,ended timestamptz)
returns void language plpgsql security definer set search_path='' as $$
declare s public.consultation_sessions;
begin
 select * into s from public.consultation_sessions where id=session_id for update;
 if not found or s.reservation_month is null or s.expires_at>now()-interval '5 minutes' or minutes is null or minutes<0 or seconds is null or seconds<0 or ended is null or ended<s.accepted_at-interval '5 seconds' or ended>now() then raise exception 'Invalid settlement'; end if;
 if s.measured_minutes is not null then return; end if;
 -- Keep conservative headroom until the tenant's billing rules are verified.
 update public.consultation_months set used_minutes=used_minutes+minutes,
 reserved_minutes=reserved_minutes-least(s.reserved_minutes,minutes) where month_start=s.reservation_month;
 update public.consultation_sessions set reserved_minutes=reserved_minutes-least(s.reserved_minutes,minutes),
 measured_minutes=minutes,duration_seconds=seconds,ended_at=ended,state='completed' where id=s.id;
end $$;
revoke all on function public.consultation_settle(uuid,integer,integer,timestamptz) from public,anon,authenticated;
grant execute on function public.consultation_settle(uuid,integer,integer,timestamptz) to service_role;
commit;
