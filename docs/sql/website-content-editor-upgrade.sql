-- Extend the existing website-content backend without changing published wording.
set lock_timeout='5s';
set statement_timeout='30s';

create or replace function public.site_content_can_edit()
returns boolean language sql stable set search_path='' as $$
  select auth.uid() is not null
    and (public.has_admin_permission('site.manage',auth.uid()) or public.has_admin_permission('site_content.edit',auth.uid()))
    and exists(select 1 from public.profiles where id=auth.uid() and account_status='active');
$$;
revoke all on function public.site_content_can_edit() from public, anon;
grant execute on function public.site_content_can_edit() to authenticated,service_role;

create or replace function public.site_content_safe_link(v text)
returns boolean language plpgsql immutable set search_path='' as $$
begin
  if v is null or length(v)>1000 or v ~ '[[:space:]\\<>]' or v ~* '[?&](token|signature|key|x-amz-[^=]*|x-goog-[^=]*)=' then return false; end if;
  if left(v,1)='/' and left(v,2)<>'//' then return v !~ '^/(admin|dashboard|api|auth)(/|[?]|$)'; end if;
  return v ~ '^https://[A-Za-z0-9][A-Za-z0-9.-]*(:[0-9]+)?([/?#]|$)' and v !~ '^https://[^/]*@';
end; $$;
revoke all on function public.site_content_safe_link(text) from public;
grant execute on function public.site_content_safe_link(text) to authenticated,service_role;

create or replace function public.site_content_valid(d jsonb)
returns boolean language plpgsql immutable set search_path='' as $$
declare s jsonb; p jsonb; l jsonb;
begin
  if d is null or jsonb_typeof(d)<>'object' or octet_length(d::text)>120000 then return false; end if;
  if d - array['slug','title','summary','version','effectiveDate','sections','schemaVersion','seoTitle','seoDescription'] <> '{}'::jsonb then return false; end if;
  if coalesce(d->>'slug','') not in ('about','terms','privacy','cookies','verification-policy','company-product-policy','employer-applicant-policy','report','security','team') then return false; end if;
  if jsonb_typeof(d->'title') is distinct from 'string' or length(btrim(d->>'title')) not between 1 and 200
     or jsonb_typeof(d->'summary') is distinct from 'string' or length(btrim(d->>'summary')) not between 1 and 1000
     or jsonb_typeof(d->'version') is distinct from 'string' or length(btrim(d->>'version')) not between 1 and 80 then return false; end if;
  if coalesce(d->>'effectiveDate','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then return false; end if;
  perform (d->>'effectiveDate')::date;
  if d ? 'schemaVersion' then
    if d->'schemaVersion'<>'2'::jsonb
       or jsonb_typeof(d->'seoTitle') is distinct from 'string' or length(btrim(d->>'seoTitle')) not between 1 and 160
       or jsonb_typeof(d->'seoDescription') is distinct from 'string' or length(btrim(d->>'seoDescription')) not between 1 and 300
       or d::text ~ '[<>]' then return false; end if;
  end if;
  if jsonb_typeof(d->'sections') is distinct from 'array' or jsonb_array_length(d->'sections') not between 1 and 40 then return false; end if;
  for s in select value from jsonb_array_elements(d->'sections') loop
    if jsonb_typeof(s)<>'object' or s - array['heading','paragraphs','links'] <> '{}'::jsonb
       or jsonb_typeof(s->'heading') is distinct from 'string' or length(btrim(s->>'heading')) not between 1 and 200
       or jsonb_typeof(s->'paragraphs') is distinct from 'array' then return false; end if;
    if jsonb_array_length(s->'paragraphs') not between 1 and 20 then return false; end if;
    for p in select value from jsonb_array_elements(s->'paragraphs') loop
      if jsonb_typeof(p)<>'string' or length(btrim(p#>>'{}')) not between 1 and 6000 then return false; end if;
    end loop;
    if s ? 'links' then
      if jsonb_typeof(s->'links') is distinct from 'array' or jsonb_array_length(s->'links')>10 then return false; end if;
      for l in select value from jsonb_array_elements(s->'links') loop
        if jsonb_typeof(l)<>'object' or l - array['label','href'] <> '{}'::jsonb
           or jsonb_typeof(l->'label') is distinct from 'string' or length(btrim(l->>'label')) not between 1 and 160
           or jsonb_typeof(l->'href') is distinct from 'string' or not public.site_content_safe_link(l->>'href') then return false; end if;
      end loop;
    end if;
  end loop;
  return true;
exception when others then return false;
end; $$;

drop policy if exists site_drafts_read on public.site_content_drafts;
create policy site_drafts_read on public.site_content_drafts for select to authenticated using ((select public.site_content_can_edit()));
drop policy if exists site_drafts_insert on public.site_content_drafts;
create policy site_drafts_insert on public.site_content_drafts for insert to authenticated with check ((select public.site_content_can_edit()));
drop policy if exists site_drafts_update on public.site_content_drafts;
create policy site_drafts_update on public.site_content_drafts for update to authenticated using ((select public.site_content_can_edit())) with check ((select public.site_content_can_edit()));
drop policy if exists site_history_read on public.site_content_history;
create policy site_history_read on public.site_content_history for select to authenticated using ((select public.site_content_can_edit()));
drop policy if exists site_history_append on public.site_content_history;
create policy site_history_append on public.site_content_history for insert to authenticated with check ((select public.site_content_can_edit()) and actor_id=(select auth.uid()));

create or replace function public.save_site_content_drafts(entries jsonb)
returns void language plpgsql set search_path='' as $$
declare e jsonb; d jsonb; expected integer; changed integer; seen text[]:='{}';
begin
  if not public.site_content_can_edit() then raise exception 'Not authorised' using errcode='42501'; end if;
  if jsonb_typeof(entries)<>'array' or jsonb_array_length(entries) not between 1 and 10 then raise exception 'Invalid batch'; end if;
  for e in select value from jsonb_array_elements(entries) loop
    d:=e->'document'; expected:=(e->>'expected_revision')::integer;
    if not public.site_content_valid(d) or expected is null or expected<0 or d->>'slug'=any(seen) then raise exception 'Invalid document'; end if;
    seen:=array_append(seen,d->>'slug');
    if expected=0 then
      insert into public.site_content_drafts(slug,document) values(d->>'slug',d) on conflict do nothing;
    else
      update public.site_content_drafts set document=d where slug=d->>'slug' and revision=expected;
    end if;
    get diagnostics changed=row_count;
    if changed<>1 then raise exception 'Draft changed; reload before retrying' using errcode='40001'; end if;
  end loop;
end; $$;

-- Existing publisher-only RLS and publication RPC remain unchanged.
-- Fix placeholder matching while preserving automatic timestamps/revisions/history.
create or replace function public.site_content_stamp()
returns trigger language plpgsql set search_path='' as $$
begin
  if tg_table_name='site_content_drafts' then
    new.revision:=case when tg_op='INSERT' then 1 else old.revision+1 end;
    new.updated_at:=now(); new.updated_by:=auth.uid();
  else
    if tg_op='UPDATE' and new.document is distinct from old.document and new.document->>'version'=old.document->>'version' then
      raise exception 'Use a new version for changed public wording';
    end if;
    if new.slug='team' and new.document::text ~* '(awaiting confirmation|role to confirm|biography to confirm)' then raise exception 'Confirm team details before publication'; end if;
    if new.document::text ~* '\[(CONFIRM|LEGAL|NAME|ADDRESS|DATE|MONITORED|RETENTION|PRIVACY|SECURITY|FULL|SHORT|ACTUAL)[^]]*\]' then raise exception 'Remove publication placeholders'; end if;
    new.published_at:=now();
  end if;
  return new;
end; $$;
