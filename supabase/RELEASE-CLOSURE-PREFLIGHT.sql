-- Read-only VetConnect release preflight. Safe to run before/after migrations 003 + 004.
with required_columns(table_name, column_name) as (
  values
    ('clinics','created_by'),('clinics','google_maps_url'),('clinics','logo_url'),('clinics','cover_image_url'),
    ('laboratories','created_by'),('laboratories','google_maps_url'),('laboratories','logo_url'),('laboratories','cover_image_url'),
    ('managed_people','created_by'),('managed_people','is_published'),
    ('companies','registration_number'),('companies','cover_image_url'),
    ('product_inquiries','company_id')
), column_checks as (
  select rc.table_name, rc.column_name,
         exists (
           select 1 from information_schema.columns c
           where c.table_schema='public' and c.table_name=rc.table_name and c.column_name=rc.column_name
         ) as present
  from required_columns rc
), required_tables(table_name) as (
  values ('managed_people'),('companies'),('admin_record_documents')
), table_checks as (
  select rt.table_name,
         exists (
           select 1 from information_schema.tables t
           where t.table_schema='public' and t.table_name=rt.table_name
         ) as present
  from required_tables rt
), required_buckets(bucket_id) as (
  values ('profile-media'),('career-documents'),('record-documents')
), bucket_checks as (
  select rb.bucket_id, exists(select 1 from storage.buckets b where b.id=rb.bucket_id) as present
  from required_buckets rb
)
select 'column' as object_type, table_name||'.'||column_name as object_name, present from column_checks
union all
select 'table', table_name, present from table_checks
union all
select 'bucket', bucket_id, present from bucket_checks
order by object_type, object_name;
