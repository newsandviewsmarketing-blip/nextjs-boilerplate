-- Unified VetConnect company profiling. Staging only: apply AFTER the clinic registration
-- compatibility migration and BEFORE deploying the dependent application build.
-- No existing company row or private legacy document is modified by this migration.
begin;

create table if not exists public.company_profile_content (
  company_id uuid primary key references public.companies(id) on delete cascade,
  year_established integer check (year_established is null or year_established between 1800 and 2100),
  tagline text,
  facebook_url text,
  instagram_url text,
  linkedin_url text,
  youtube_url text,
  other_url text,
  profile_tone text not null default 'navy' check (profile_tone in ('navy','orange','slate')),
  updated_at timestamptz not null default now()
);

create table if not exists public.company_private_contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  sort_order integer not null default 0,
  full_name text not null check (char_length(trim(full_name)) between 1 and 150),
  designation text,
  department text,
  office_phone text,
  mobile_phone text,
  email text,
  reports_to text,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists company_private_contacts_order_idx
  on public.company_private_contacts(company_id,sort_order,id);

alter table public.company_profile_content enable row level security;
alter table public.company_private_contacts enable row level security;
revoke all on public.company_private_contacts from anon;
grant select on public.company_profile_content to anon;
grant select,insert,update,delete on public.company_profile_content to authenticated;
grant select,insert,update,delete on public.company_private_contacts to authenticated;

create policy company_profile_content_read on public.company_profile_content
for select to anon, authenticated
using (
  exists (
    select 1 from public.companies c
    where c.id = company_id and c.is_published = true and c.verification_status = 'approved'
       and c.record_status = 'active'
  )
  or (auth.uid() is not null and
      (public.is_admin() or public.company_has_permission(company_id,'company.view_private')
                         or public.company_has_permission(company_id,'company.manage')))
);
create policy company_profile_content_insert on public.company_profile_content
for insert to authenticated
with check (public.is_admin() or public.company_has_permission(company_id,'company.manage'));
create policy company_profile_content_update on public.company_profile_content
for update to authenticated
using (public.is_admin() or public.company_has_permission(company_id,'company.manage'))
with check (public.is_admin() or public.company_has_permission(company_id,'company.manage'));
create policy company_profile_content_delete on public.company_profile_content
for delete to authenticated
using (public.is_admin() or public.company_has_permission(company_id,'company.manage'));

create policy company_private_contacts_read on public.company_private_contacts
for select to authenticated
using (public.is_admin() or public.company_has_permission(company_id,'company.manage') or
        public.company_has_permission(company_id,'company.view_private'));
create policy company_private_contacts_insert on public.company_private_contacts
for insert to authenticated
with check (public.is_admin() or public.company_has_permission(company_id,'company.manage'));
create policy company_private_contacts_update on public.company_private_contacts
for update to authenticated
using (public.is_admin() or public.company_has_permission(company_id,'company.manage'))
with check (public.is_admin() or public.company_has_permission(company_id,'company.manage'));
create policy company_private_contacts_delete on public.company_private_contacts
for delete to authenticated
using (public.is_admin() or public.company_has_permission(company_id,'company.manage'));

-- Keep the whole private card replacement within one database transaction.
-- SECURITY INVOKER preserves RLS, with explicit server-checked company membership.
create or replace function public.save_company_profile_supplement(
  p_company_id uuid, p_public jsonb, p_contacts jsonb
) returns void
language plpgsql security invoker set search_path = 'public'
as $body$
declare v_contact jsonb; v_pos integer := 0;
begin
  if auth.uid() is null or not
      (public.is_admin() or public.company_has_permission(p_company_id,'company.manage')) then
    raise exception 'Company editing is not authorized.' using errcode='42501';
  end if;
  if p_public is null or jsonb_typeof(p_public) <> 'object' then
    raise exception 'Invalid company profile content.';
  end if;
  if p_contacts is null or jsonb_typeof(p_contacts) <> 'array' or jsonb_array_length(p_contacts) > 30 then
    raise exception 'Invalid management contacts.';
  end if;
  if length(coalesce(p_public->>'tagline','')) > 240 then
    raise exception 'Company introduction is too long.';
  end if;

  insert into public.company_profile_content
    (company_id,year_established,tagline,facebook_url,instagram_url,linkedin_url,youtube_url,other_url,profile_tone,updated_at)
  values (
    p_company_id,nullif(p_public->>'year_established','')::integer,
    nullif(trim(p_public->>'tagline'),''),
    nullif(trim(p_public->>'facebook_url'),''),
    nullif(trim(p_public->>'instagram_url'),''),
    nullif(trim(p_public->>'linkedin_url'),''),
    nullif(trim(p_public->>'youtube_url'),''),
    nullif(trim(p_public->>'other_url'),''),
    case when p_public->>'profile_tone' in ('navy','orange','slate')
      then p_public->>'profile_tone' else 'navy' end,now()
  )
  on conflict (company_id) do update set
    year_established=excluded.year_established,tagline=excluded.tagline,
    facebook_url=excluded.facebook_url,instagram_url=excluded.instagram_url,
    linkedin_url=excluded.linkedin_url,youtube_url=excluded.youtube_url,
    other_url=excluded.other_url,profile_tone=excluded.profile_tone,updated_at=now();

  delete from public.company_private_contacts where company_id=p_company_id;
  for v_contact in select value from jsonb_array_elements(p_contacts) loop
    if jsonb_typeof(v_contact) <> 'object' or length(trim(coalesce(v_contact->>'full_name',''))) > 150 then
      raise exception 'Invalid management contact.';
    end if;
    if trim(coalesce(v_contact->>'full_name','')) <> '' then
      insert into public.company_private_contacts
        (company_id,sort_order,full_name,designation,department,office_phone,mobile_phone,email,reports_to,notes)
      values (
        p_company_id,v_pos,trim(v_contact->>'full_name'),
        left(nullif(trim(v_contact->>'designation'),''),150),
        left(nullif(trim(v_contact->>'department'),''),120),
        left(nullif(trim(v_contact->>'office_phone'),''),60),
        left(nullif(trim(v_contact->>'mobile_phone'),''),60),
        left(nullif(trim(v_contact->>'email'),''),240),
        left(nullif(trim(v_contact->>'reports_to'),''),150),
        left(nullif(trim(v_contact->>'notes'),''),1500)
      );
    end if;
    v_pos := v_pos+1;
  end loop;
end;
$body$;
revoke all on function public.save_company_profile_supplement(uuid,jsonb,jsonb) from public,anon;
grant execute on function public.save_company_profile_supplement(uuid,jsonb,jsonb) to authenticated;
commit;
