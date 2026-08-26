-- VetConnect Pakistan post-migration validation
-- Run after the intended migrations have completed in Preview/staging first.

select 'admin_role_permissions' as check_name, count(*)::text as result
from public.admin_role_permissions;

select 'phase4_product_columns' as check_name,
       count(*) filter (where column_name in ('published_at','published_by','archived_at','archived_by','last_edited_by'))::text || '/5' as result
from information_schema.columns
where table_schema='public' and table_name='products';

select 'phase4_functions' as check_name,
       count(distinct p.proname)::text || '/3' as result
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in ('is_super_admin','has_admin_permission','can_manage_jobs');

select 'rls_disabled_sensitive_tables' as check_name, count(*)::text as result
from pg_class c
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r'
  and c.relname in ('profiles','user_roles','veterinarian_profiles','company_profiles','products','product_regulatory','jobs','job_applications','audit_logs')
  and not c.relrowsecurity;

select 'public_company_view_columns' as check_name,
       string_agg(column_name, ', ' order by ordinal_position) as result
from information_schema.columns
where table_schema='public' and table_name='public_companies';

select 'public_directory_views' as check_name, count(*)::text || '/6' as result
from information_schema.views
where table_schema='public'
  and table_name in ('public_veterinarians','public_companies','public_professionals','public_clinics','public_laboratories','public_jobs');
