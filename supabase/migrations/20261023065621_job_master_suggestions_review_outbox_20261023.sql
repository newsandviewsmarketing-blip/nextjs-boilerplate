begin;
-- Wrong geographic entry was previously classified as a job sector.
update public.master_data_items set is_active=false,updated_at=now()
where category='job_sector' and lower(trim(label))='punjab';
insert into public.master_data_items (category,code,label,sort_order,is_active)
select 'job_sector', v.code, v.label, 50, true from (values
('veterinary_services','Veterinary Services'),
('animal_health','Animal Health'),
('feed_nutrition','Feed & Nutrition'),
('fisheries_aquaculture','Fisheries / Aquaculture'),
('wildlife_conservation','Wildlife / Conservation'),
('food_safety','Food Safety'),
('agriculture','Agriculture'),
('sales_marketing','Sales & Marketing'),
('public_sector','Government / Public Sector')
) v(code,label)
where not exists (select 1 from public.master_data_items m where m.category='job_sector' and lower(m.label)=lower(v.label));
insert into public.master_data_items (category,code,label,sort_order,is_active)
select 'job_qualification', v.code, v.label, 10, true from (values
('dvm','DVM'),('mphil','MPhil'),('phd','PhD'),('msc','MSc'),('bsc','BSc'),
('bs','BS'),('mba','MBA'),('bba','BBA'),('diploma','Diploma'),
('intermediate','Intermediate'),('matric','Matric')
) v(code,label)
where not exists (select 1 from public.master_data_items m where m.category='job_qualification' and lower(m.label)=lower(v.label));

create table if not exists public.master_data_suggestions (
 id uuid primary key default gen_random_uuid(),
 category text not null check (category in ('job_sector','job_qualification','city','district','tehsil')),
 label text not null check (char_length(trim(label)) between 2 and 150),
 context_province text,
 created_by uuid not null references auth.users(id) on delete cascade default auth.uid(),
 source_job_id uuid references public.jobs(id) on delete set null,
 status text not null default 'pending' check (status in ('pending','approved','rejected')),
 reviewed_by uuid references auth.users(id) on delete set null,
 reviewed_at timestamptz,
 review_note text,
 created_at timestamptz not null default now()
);
create unique index if not exists master_data_suggestions_unique_author
 on public.master_data_suggestions(category,lower(trim(label)),lower(coalesce(context_province,'')),created_by)
 where status='pending';
create index if not exists master_data_suggestions_status_idx on public.master_data_suggestions(status,created_at);
alter table public.master_data_suggestions enable row level security;
drop policy if exists mds_own_read on public.master_data_suggestions;
create policy mds_own_read on public.master_data_suggestions for select to authenticated
 using (created_by=auth.uid() or public.has_admin_permission('master_data.manage'));
drop policy if exists mds_own_insert on public.master_data_suggestions;
create policy mds_own_insert on public.master_data_suggestions for insert to authenticated
 with check (created_by=auth.uid() and status='pending');
drop policy if exists mds_admin_update on public.master_data_suggestions;
create policy mds_admin_update on public.master_data_suggestions for update to authenticated
 using (public.has_admin_permission('master_data.manage'))
 with check (public.has_admin_permission('master_data.manage'));
grant select,insert,update on public.master_data_suggestions to authenticated;

create table if not exists public.admin_review_notifications (
 id uuid primary key default gen_random_uuid(),
 event_kind text not null check(event_kind in ('job_submitted','master_data_suggested')),
 entity_id uuid not null,
 subject text not null,
 detail text,
 email_status text not null default 'pending' check(email_status in ('pending','sent','unavailable','failed')),
 created_at timestamptz not null default now(),
 emailed_at timestamptz,
 unique(event_kind,entity_id)
);
alter table public.admin_review_notifications enable row level security;
drop policy if exists arn_admin_read on public.admin_review_notifications;
create policy arn_admin_read on public.admin_review_notifications for select to authenticated
 using(public.has_admin_permission('jobs.manage') or public.has_admin_permission('master_data.manage'));
grant select on public.admin_review_notifications to authenticated;
create or replace function public.queue_pending_job_review()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.verification_status='pending' and new.is_published=false then
  insert into public.admin_review_notifications(event_kind,entity_id,subject,detail)
   values ('job_submitted',new.id,'Job needs review',left(new.title,200))
  on conflict (event_kind,entity_id) do nothing;
 end if;
 return new;
end;
$$;
drop trigger if exists trg_queue_pending_job_review on public.jobs;
create trigger trg_queue_pending_job_review after insert on public.jobs for each row execute function public.queue_pending_job_review();
create or replace function public.queue_master_suggestion_review()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.admin_review_notifications(event_kind,entity_id,subject,detail)
 values ('master_data_suggested',new.id,'New master data suggestion',left(new.category||': '||new.label,200))
 on conflict(event_kind,entity_id) do nothing;
 return new;
end;
$$;
drop trigger if exists trg_queue_master_suggestion_review on public.master_data_suggestions;
create trigger trg_queue_master_suggestion_review after insert on public.master_data_suggestions for each row execute function public.queue_master_suggestion_review();
commit;