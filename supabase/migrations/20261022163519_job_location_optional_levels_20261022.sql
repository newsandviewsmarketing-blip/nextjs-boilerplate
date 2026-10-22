begin;

alter table public.company_regions
  add column if not exists region_type text not null default 'region';
alter table public.company_regions
  add column if not exists province text;

alter table public.company_regions drop constraint if exists company_regions_region_type_check;
alter table public.company_regions add constraint company_regions_region_type_check
  check (region_type in ('region','territory','area'));

alter table public.job_coverage drop constraint if exists job_coverage_scope_check;
alter table public.job_coverage add constraint job_coverage_scope_check
  check (scope in ('nationwide','province','region','territory','area','district','city','multiple','flexible'));

create index if not exists company_regions_company_type_province_idx
  on public.company_regions(company_id, region_type, province);
create index if not exists job_coverage_areas_district_idx
  on public.job_coverage_areas(lower(district));

commit;
