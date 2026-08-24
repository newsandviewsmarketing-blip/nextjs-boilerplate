-- VetConnect Pakistan read-only database preflight
-- Date: 2026-08-24
-- SAFE: this script does not create, alter, update or delete data.
-- Run in Supabase SQL Editor BEFORE applying any Phase 3/4 migration.

-- 1) Required table/view inventory
with required_objects(kind, object_name) as (
  values
    ('table','profiles'),
    ('table','user_roles'),
    ('table','veterinarian_profiles'),
    ('table','company_profiles'),
    ('table','audit_logs'),
    ('table','products'),
    ('table','product_compliance'),
    ('table','product_inquiries'),
    ('table','saved_products'),
    ('table','professional_profiles'),
    ('table','professional_credentials'),
    ('table','clinics'),
    ('table','laboratories'),
    ('table','company_roles'),
    ('table','company_locations'),
    ('table','product_variants'),
    ('table','product_regulatory'),
    ('table','jobs'),
    ('table','job_applications'),
    ('table','job_matches'),
    ('table','verification_records'),
    ('table','admin_role_permissions'),
    ('view','public_veterinarians'),
    ('view','public_companies'),
    ('view','public_professionals'),
    ('view','public_clinics'),
    ('view','public_laboratories'),
    ('view','public_jobs')
)
select
  kind,
  object_name,
  case
    when kind = 'table' then exists (
      select 1 from information_schema.tables
      where table_schema='public' and table_name=object_name and table_type='BASE TABLE'
    )
    when kind = 'view' then exists (
      select 1 from information_schema.views
      where table_schema='public' and table_name=object_name
    )
    else false
  end as present
from required_objects
order by kind, object_name;

-- 2) Phase 4 product lifecycle columns
with required_columns(column_name) as (
  values
    ('published_at'),('published_by'),('archived_at'),('archived_by'),('last_edited_by')
)
select
  'products' as table_name,
  rc.column_name,
  exists (
    select 1 from information_schema.columns c
    where c.table_schema='public' and c.table_name='products' and c.column_name=rc.column_name
  ) as present
from required_columns rc
order by rc.column_name;

-- 3) Required functions used by the admin/security model
with required_functions(function_name) as (
  values ('is_admin'),('is_super_admin'),('has_admin_permission'),('can_manage_jobs')
)
select
  rf.function_name,
  exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname=rf.function_name
  ) as present
from required_functions rf
order by rf.function_name;

-- 4) RLS status for sensitive tables that exist
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public'
  and c.relkind='r'
  and c.relname in (
    'profiles','user_roles','veterinarian_profiles','company_profiles','products',
    'product_compliance','product_regulatory','jobs','job_applications','verification_records',
    'admin_role_permissions','audit_logs'
  )
order by c.relname;

-- 5) Existing policies on key tables
select schemaname, tablename, policyname, roles, cmd
from pg_policies
where schemaname='public'
  and tablename in (
    'profiles','user_roles','veterinarian_profiles','company_profiles','products',
    'product_regulatory','jobs','job_applications','admin_role_permissions','audit_logs'
  )
order by tablename, policyname;

-- 6) Does Supabase migration-history tracking exist?
-- A NULL result means the tracking table is not present in this database.
select to_regclass('supabase_migrations.schema_migrations') as migration_history_table;

-- 7) Data-preservation baseline counts, dynamically and safely.
do $$
declare
  t text;
  c bigint;
begin
  foreach t in array array[
    'profiles','user_roles','veterinarian_profiles','company_profiles','products',
    'product_compliance','product_inquiries','saved_products','professional_profiles',
    'clinics','laboratories','jobs','job_applications','verification_records','audit_logs'
  ] loop
    if to_regclass(format('public.%I', t)) is not null then
      execute format('select count(*) from public.%I', t) into c;
      raise notice 'ROWCOUNT % = %', t, c;
    else
      raise notice 'ROWCOUNT % = TABLE NOT PRESENT', t;
    end if;
  end loop;
end $$;
