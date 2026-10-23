begin;

-- Flexible job territories. Existing job records remain valid.
create table if not exists public.geo_areas (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.geo_areas(id) on delete restrict,
  level text not null check (level in ('country','province','district','tehsil','city')),
  code text unique,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists geo_areas_parent_idx on public.geo_areas(parent_id);
create table if not exists public.geo_aliases (
  id uuid primary key default gen_random_uuid(),
  area_id uuid not null references public.geo_areas(id) on delete cascade,
  alias text not null,
  language text,
  unique (area_id, alias)
);
create index if not exists geo_aliases_alias_idx on public.geo_aliases(lower(alias));

create table if not exists public.company_regions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  parent_region_id uuid references public.company_regions(id) on delete set null,
  name text not null,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (company_id, name)
);
create index if not exists company_regions_company_idx on public.company_regions(company_id);

create table if not exists public.company_region_areas (
  id uuid primary key default gen_random_uuid(),
  region_id uuid not null references public.company_regions(id) on delete cascade,
  area_level text not null check (area_level in ('province','district','tehsil','city')),
  province text,
  district text,
  tehsil text,
  city text,
  label text not null,
  created_at timestamptz not null default now()
);
create index if not exists company_region_areas_region_idx on public.company_region_areas(region_id);

create table if not exists public.job_coverage (
  job_id uuid primary key references public.jobs(id) on delete cascade,
  scope text not null check (scope in ('nationwide','province','region','district','city','multiple','flexible')),
  province text,
  region_id uuid references public.company_regions(id) on delete set null,
  display_text text not null,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists job_coverage_scope_province_idx on public.job_coverage(scope, province);
create table if not exists public.job_coverage_areas (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  area_level text not null check (area_level in ('province','district','tehsil','city')),
  province text,
  district text,
  tehsil text,
  city text,
  label text not null,
  created_at timestamptz not null default now()
);
create index if not exists job_coverage_areas_job_idx on public.job_coverage_areas(job_id);
create index if not exists job_coverage_areas_city_idx on public.job_coverage_areas(lower(city));
create index if not exists job_coverage_areas_province_idx on public.job_coverage_areas(lower(province));

-- Unspecified experience is different from zero required years.
alter table public.jobs alter column minimum_experience drop not null;
alter table public.jobs alter column minimum_experience drop default;

-- Canonical companies without legacy user profiles can post jobs;
-- linked companies continue to have their legacy identity validated.
create or replace function public.sync_job_company_identity()
returns trigger language plpgsql set search_path = public as $$
declare
  legacy_id uuid;
  canonical_id uuid;
begin
  if new.company_id is not null then
    select legacy_company_user_id into legacy_id
    from public.companies where id = new.company_id;
    if not found then raise exception 'Canonical company not found'; end if;
    if legacy_id is null then
      if new.company_user_id is not null then
        raise exception 'Unlinked canonical company cannot use legacy owner';
      end if;
    elsif new.company_user_id is null then
      new.company_user_id := legacy_id;
    elsif new.company_user_id <> legacy_id then
      raise exception 'Job company identity mismatch';
    end if;
    return new;
  end if;
  select id into canonical_id from public.companies
  where legacy_company_user_id = new.company_user_id;
  if not found then raise exception 'Canonical company record required'; end if;
  new.company_id := canonical_id;
  return new;
end;
$$;

insert into public.geo_areas (level, code, name)
values ('country','PK','Pakistan')
on conflict(code) do nothing;
insert into public.geo_areas (parent_id,level,code,name)
select c.id, 'province', v.code, v.name
from public.geo_areas c
cross join (values
  ('PK-PB','Punjab'),('PK-SD','Sindh'),('PK-KP','Khyber Pakhtunkhwa'),
  ('PK-BA','Balochistan'),('PK-IS','Islamabad Capital Territory'),
  ('PK-GB','Gilgit-Baltistan'),('PK-JK','Azad Jammu and Kashmir')
) as v(code,name)
where c.code = 'PK'
on conflict(code) do nothing;

alter table public.geo_areas enable row level security;
alter table public.geo_aliases enable row level security;
alter table public.company_regions enable row level security;
alter table public.company_region_areas enable row level security;
alter table public.job_coverage enable row level security;
alter table public.job_coverage_areas enable row level security;

drop policy if exists geo_areas_read on public.geo_areas;
drop policy if exists geo_aliases_read on public.geo_aliases;
drop policy if exists geo_areas_admin on public.geo_areas;
drop policy if exists geo_aliases_admin on public.geo_aliases;
drop policy if exists company_regions_read on public.company_regions;
drop policy if exists company_regions_write on public.company_regions;
drop policy if exists company_region_areas_read on public.company_region_areas;
drop policy if exists company_region_areas_write on public.company_region_areas;
drop policy if exists job_coverage_read on public.job_coverage;
drop policy if exists job_coverage_write on public.job_coverage;
drop policy if exists job_coverage_areas_read on public.job_coverage_areas;
drop policy if exists job_coverage_areas_write on public.job_coverage_areas;

create policy geo_areas_read on public.geo_areas for select to anon, authenticated using (is_active);
create policy geo_aliases_read on public.geo_aliases for select to anon, authenticated using (true);
create policy geo_areas_admin on public.geo_areas for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy geo_aliases_admin on public.geo_aliases for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy company_regions_read on public.company_regions for select to authenticated
using (public.can_manage_jobs() or public.is_admin() or public.company_has_permission(company_id,'jobs.manage'));
create policy company_regions_write on public.company_regions for all to authenticated
using (public.can_manage_jobs() or public.is_admin() or public.company_has_permission(company_id,'jobs.manage'))
with check (public.can_manage_jobs() or public.is_admin() or public.company_has_permission(company_id,'jobs.manage'));
create policy company_region_areas_read on public.company_region_areas for select to authenticated
using (exists (select 1 from public.company_regions r where r.id = region_id and
(public.can_manage_jobs() or public.is_admin() or public.company_has_permission(r.company_id,'jobs.manage'))));
create policy company_region_areas_write on public.company_region_areas for all to authenticated
using (exists (select 1 from public.company_regions r where r.id = region_id and
(public.can_manage_jobs() or public.is_admin() or public.company_has_permission(r.company_id,'jobs.manage'))))
with check (exists (select 1 from public.company_regions r where r.id = region_id and
(public.can_manage_jobs() or public.is_admin() or public.company_has_permission(r.company_id,'jobs.manage'))));

create policy job_coverage_read on public.job_coverage for select to anon, authenticated
using (exists (select 1 from public.jobs j where j.id = job_id and
((j.verification_status = 'approved'::public.approval_status and j.is_published)
or public.can_manage_jobs() or public.is_admin() or public.company_has_permission(j.company_id,'jobs.manage'))));
create policy job_coverage_write on public.job_coverage for all to authenticated
using (exists (select 1 from public.jobs j where j.id = job_id and
(public.can_manage_jobs() or public.is_admin() or public.company_has_permission(j.company_id,'jobs.manage'))))
with check (exists (select 1 from public.jobs j where j.id = job_id and
(public.can_manage_jobs() or public.is_admin() or public.company_has_permission(j.company_id,'jobs.manage'))));
create policy job_coverage_areas_read on public.job_coverage_areas for select to anon, authenticated
using (exists (select 1 from public.jobs j where j.id = job_id and
((j.verification_status = 'approved'::public.approval_status and j.is_published)
or public.can_manage_jobs() or public.is_admin() or public.company_has_permission(j.company_id,'jobs.manage'))));
create policy job_coverage_areas_write on public.job_coverage_areas for all to authenticated
using (exists (select 1 from public.jobs j where j.id = job_id and
(public.can_manage_jobs() or public.is_admin() or public.company_has_permission(j.company_id,'jobs.manage'))))
with check (exists (select 1 from public.jobs j where j.id = job_id and
(public.can_manage_jobs() or public.is_admin() or public.company_has_permission(j.company_id,'jobs.manage'))));

-- Explicit Data API grants remain governed by RLS.
grant select on public.geo_areas, public.geo_aliases, public.job_coverage, public.job_coverage_areas to anon, authenticated;
grant select, insert, update, delete on public.geo_areas, public.geo_aliases,
public.company_regions, public.company_region_areas, public.job_coverage, public.job_coverage_areas to authenticated;

commit;
