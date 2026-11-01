begin;
-- Additive only: existing preferences, job approval and public views are preserved.
alter table public.candidate_preferences
 add column if not exists desired_roles text[] not null default '{}',
 add column if not exists preferred_countries text[] not null default '{}',
 add column if not exists work_mode text not null default 'Any' check (work_mode in ('Any','On-site','Remote','Hybrid')),
 add column if not exists job_market text not null default 'Any' check (job_market in ('Any','Pakistan','International')),
 add column if not exists salary_min numeric(12,2) check (salary_min>=0),
 add column if not exists salary_max numeric(12,2) check (salary_max>=salary_min and salary_max>=0),
 add column if not exists salary_currency text not null default 'PKR' check (salary_currency ~ '^[A-Z]{3}$'),
 add column if not exists salary_period text not null default 'month' check (salary_period in ('hour','month','year')),
 add column if not exists salary_negotiable boolean not null default true,
 add column if not exists include_undisclosed_salary boolean not null default true,
 add column if not exists email_alerts boolean not null default false;
-- Consent is opt-in; no existing candidate is subscribed by this migration.
alter table public.jobs
 add column if not exists country text not null default 'Pakistan',
 add column if not exists work_mode text not null default 'On-site' check (work_mode in ('On-site','Remote','Hybrid')),
 add column if not exists salary_min numeric(12,2) check (salary_min>=0),
 add column if not exists salary_max numeric(12,2) check (salary_max>=salary_min and salary_max>=0),
 add column if not exists salary_currency text not null default 'PKR' check (salary_currency ~ '^[A-Z]{3}$'),
 add column if not exists salary_period text not null default 'month' check (salary_period in ('hour','month','year'));
alter table public.career_cv_profiles add column if not exists photo_path text;
alter table public.career_cv_profiles add constraint career_cv_photo_owner_path
 check (photo_path is null or split_part(photo_path,'/',1)=user_id::text);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('career-cv-photos','career-cv-photos',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;
create policy career_cv_photo_read on storage.objects for select to authenticated
using(bucket_id='career-cv-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy career_cv_photo_insert on storage.objects for insert to authenticated
with check(bucket_id='career-cv-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy career_cv_photo_delete on storage.objects for delete to authenticated
using(bucket_id='career-cv-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);

create table public.career_alert_outbox (
 id uuid primary key default gen_random_uuid(),
 event_key text not null unique,
 user_id uuid not null references auth.users(id) on delete cascade,
 job_id uuid references public.jobs(id) on delete cascade,
 kind text not null check(kind in ('job_match','candidate_receipt','admin_candidate')),
 status text not null default 'pending' check(status in ('pending','processing','accepted','skipped','failed')),
 attempts integer not null default 0,
 available_at timestamptz not null default now(),
 locked_until timestamptz,
 claim_token uuid,
 first_attempt_at timestamptz,
 accepted_at timestamptz,
 provider_id text,
 last_error text,
 created_at timestamptz not null default now(),
 check ((kind='job_match')=(job_id is not null))
);
alter table public.career_alert_outbox enable row level security;
-- Queue state is operational data, not client-editable data.
revoke all on public.career_alert_outbox from public,anon,authenticated;
grant select,insert,update,delete on public.career_alert_outbox to service_role;
create index career_alert_due_idx on public.career_alert_outbox(available_at) where status in ('pending','processing');

create schema if not exists career_internal;
revoke all on schema career_internal from public,anon,authenticated;
create function career_internal.enqueue(p_user_id uuid default null,p_job_id uuid default null)
returns void language plpgsql security definer set search_path='' as $$
begin
 -- This function is callable only by triggers, never by the Data API.
 insert into public.career_alert_outbox(event_key,user_id,kind)
 select 'career-ready:'||cv.user_id||':'||k.kind,cv.user_id,k.kind
 from public.career_cv_profiles cv
 join public.profiles p on p.id=cv.user_id and p.account_status='active'
 join auth.users u on u.id=cv.user_id and u.email_confirmed_at is not null
 cross join (values('candidate_receipt'),('admin_candidate')) as k(kind)
 where p_user_id=cv.user_id and p.primary_role::text in ('candidate','professional','veterinarian')
 and length(trim(cv.full_name))>1 and length(trim(cv.headline))>1
 and length(trim(cv.education))>1 and length(trim(cv.skills))>1
 on conflict(event_key) do nothing;

 insert into public.career_alert_outbox(event_key,user_id,job_id,kind)
 select 'job:'||j.id||':'||cp.professional_user_id,cp.professional_user_id,j.id,'job_match'
 from public.candidate_preferences cp
 join public.profiles p on p.id=cp.professional_user_id and p.account_status='active'
 join public.professional_profiles pp on pp.user_id=p.id and pp.verification_status='approved'
 join auth.users u on u.id=p.id and u.email_confirmed_at is not null
 join public.career_cv_profiles cv on cv.user_id=p.id
 cross join public.jobs j
 where cp.email_alerts and (p_user_id is null or cp.professional_user_id=p_user_id)
 and (p_job_id is null or j.id=p_job_id)
 and j.is_published and j.verification_status='approved'
 and (j.deadline is null or j.deadline >= (now() at time zone 'Asia/Karachi')::date)
 and length(trim(cv.full_name))>1 and length(trim(cv.headline))>1
 and length(trim(cv.education))>1 and length(trim(cv.skills))>1
 on conflict(event_key) do update set status='pending',available_at=now(),last_error=null
 where career_alert_outbox.status='skipped' and career_alert_outbox.attempts=0;
end;
$$;
revoke all on function career_internal.enqueue(uuid,uuid) from public,anon,authenticated;

create function career_internal.on_candidate_change() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_table_name='candidate_preferences' then perform career_internal.enqueue(new.professional_user_id,null);
 elsif tg_table_name='career_cv_profiles' or tg_table_name='professional_profiles' then perform career_internal.enqueue(new.user_id,null);
 else perform career_internal.enqueue(new.id,null); end if;
 return new;
end;
$$;
revoke all on function career_internal.on_candidate_change() from public,anon,authenticated;
create trigger career_preferences_queue after insert or update on public.candidate_preferences
 for each row execute function career_internal.on_candidate_change();
create trigger career_cv_queue after insert or update on public.career_cv_profiles
 for each row execute function career_internal.on_candidate_change();
create trigger career_profile_queue after update of verification_status on public.professional_profiles
 for each row execute function career_internal.on_candidate_change();
create trigger career_account_queue after update of account_status on public.profiles
 for each row execute function career_internal.on_candidate_change();
create trigger career_verified_email_queue after update of email_confirmed_at on auth.users
 for each row execute function career_internal.on_candidate_change();
create function career_internal.on_job_change() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.is_published and new.verification_status='approved' then
  perform career_internal.enqueue(null,new.id);
 end if;
 return new;
end;
$$;
revoke all on function career_internal.on_job_change() from public,anon,authenticated;
create trigger career_job_queue after insert or update of is_published,verification_status,title,description,sector,city,employment_type,country,work_mode,salary_min,salary_max,salary_currency,salary_period,deadline on public.jobs
 for each row execute function career_internal.on_job_change();

-- Atomic leases prevent concurrent schedulers from claiming the same row.
create function public.claim_career_alerts(p_limit integer default 20)
returns setof public.career_alert_outbox language plpgsql security invoker set search_path='' as $$
begin
 update public.career_alert_outbox set status='failed',last_error='Retry window expired; inspect provider before manual retry'
 where status in ('pending','processing') and first_attempt_at<now()-interval '20 hours';
 return query
 with due as (
 select id from public.career_alert_outbox
 where (status='pending' and available_at<=now()) or (status='processing' and locked_until<now())
 order by available_at,id for update skip locked limit greatest(1,least(p_limit,50))
 )
 update public.career_alert_outbox q set status='processing',locked_until=now()+interval '5 minutes',
 claim_token=gen_random_uuid(),first_attempt_at=coalesce(first_attempt_at,now()),attempts=attempts+1
 from due where q.id=due.id returning q.*;
end;
$$;
revoke all on function public.claim_career_alerts(integer) from public,anon,authenticated;
grant execute on function public.claim_career_alerts(integer) to service_role;
commit;
