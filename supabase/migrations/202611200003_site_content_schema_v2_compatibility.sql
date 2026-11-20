-- Accept editor schema version 2 without altering existing drafts or publications.\ncreate or replace function public.site_content_safe_link(v text)
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

