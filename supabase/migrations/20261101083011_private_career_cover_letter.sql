begin;
create table public.career_cover_letters (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 job_title text check (char_length(job_title)<=160),
 company_name text check (char_length(company_name)<=180),
 body_text text not null check (char_length(btrim(body_text)) between 20 and 3000),
 updated_at timestamptz not null default now()
);
alter table public.career_cover_letters enable row level security;
revoke all on public.career_cover_letters from public,anon,authenticated;
grant select,insert,update,delete on public.career_cover_letters to authenticated;
grant select,insert,update,delete on public.career_cover_letters to service_role;
create policy career_cover_letter_owner on public.career_cover_letters for all to authenticated
using(user_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=auth.uid() and p.account_status='active'))
with check(user_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=auth.uid() and p.account_status='active'));
alter table public.candidate_preferences
 add column if not exists opportunity_focus text not null default 'Any' check(opportunity_focus in ('Any','Jobs','Internships')),
 add column if not exists guidance_requested boolean not null default false;
comment on table public.career_cover_letters is 'Private reusable draft. A letter is copied to an application only when the candidate explicitly selects it.';
commit;
