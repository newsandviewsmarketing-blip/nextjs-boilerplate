-- Compatibility repair for website editor. Does not modify page data or existing RLS.
create or replace function public.site_content_can_edit()
returns boolean language sql stable set search_path='' as $$
  select public.site_content_can_manage();
$$;
revoke all on function public.site_content_can_edit() from public, anon;
grant execute on function public.site_content_can_edit() to authenticated, service_role;
