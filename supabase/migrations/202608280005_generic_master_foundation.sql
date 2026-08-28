begin;

-- ============================================================
-- VetConnect
-- Canonical Generic / Active Ingredient Master Foundation
--
-- Goals:
-- 1. Create one canonical master for generic substances.
-- 2. Support alternate names / synonyms without duplicates.
-- 3. Support single and combination products.
-- 4. Preserve legacy products.generic_name and composition.
-- 5. Do NOT auto-backfill existing product free-text values.
-- ============================================================


-- ============================================================
-- 1. NORMALIZATION HELPER
-- ============================================================

create or replace function public.normalize_generic_term(
  p_value text
)
returns text
language sql
immutable
set search_path = public
as $$
  select lower(
    regexp_replace(
      btrim(coalesce(p_value, '')),
      '[^[:alnum:]]+',
      '',
      'g'
    )
  );
$$;


-- ============================================================
-- 2. CANONICAL GENERIC / SUBSTANCE MASTER
-- ============================================================

create table if not exists public.generic_substances (
  id uuid primary key default gen_random_uuid(),

  canonical_name text not null,
  normalized_name text not null,

  substance_type text not null default 'other'
    check (
      substance_type in (
        'active_ingredient',
        'vitamin',
        'mineral',
        'amino_acid',
        'enzyme',
        'probiotic',
        'prebiotic',
        'botanical',
        'nutritional',
        'excipient',
        'other'
      )
    ),

  description text,

  verification_status public.approval_status
    not null default 'pending'::public.approval_status,

  record_status text not null default 'active'
    check (
      record_status in (
        'active',
        'inactive',
        'merged'
      )
    ),

  merged_into_id uuid
    references public.generic_substances(id)
    on delete restrict,

  created_by uuid
    references public.profiles(id)
    on delete set null,

  approved_by uuid
    references public.profiles(id)
    on delete set null,

  approved_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint generic_substances_name_not_blank
    check (btrim(canonical_name) <> ''),

  constraint generic_substances_normalized_not_blank
    check (btrim(normalized_name) <> ''),

  constraint generic_substances_merge_shape
    check (
      (
        record_status = 'merged'
        and merged_into_id is not null
      )
      or
      (
        record_status <> 'merged'
        and merged_into_id is null
      )
    ),

  constraint generic_substances_no_self_merge
    check (
      merged_into_id is null
      or merged_into_id <> id
    )
);


create unique index if not exists
  generic_substances_normalized_name_unique_idx
on public.generic_substances(normalized_name);


create index if not exists
  generic_substances_status_idx
on public.generic_substances(
  record_status,
  verification_status
);


-- ============================================================
-- 3. AUTO-NORMALIZE CANONICAL NAME
-- ============================================================

create or replace function
public.set_generic_substance_normalized_name()
returns trigger
language plpgsql
set search_path = public
as $$
begin

  new.canonical_name := btrim(new.canonical_name);

  new.normalized_name :=
    public.normalize_generic_term(new.canonical_name);

  if new.normalized_name = '' then
    raise exception 'Generic/substance name cannot be empty';
  end if;

  return new;
end;
$$;


drop trigger if exists
  generic_substances_normalize_name
on public.generic_substances;


create trigger generic_substances_normalize_name
before insert or update of canonical_name
on public.generic_substances
for each row
execute function
  public.set_generic_substance_normalized_name();


-- ============================================================
-- 4. GENERIC / SUBSTANCE SYNONYMS
--
-- Examples:
-- canonical: Vitamin B12
-- synonym: Cyanocobalamin
--
-- canonical: DL-Methionine
-- synonym: Methionine
-- ============================================================

create table if not exists public.generic_synonyms (
  id uuid primary key default gen_random_uuid(),

  substance_id uuid not null
    references public.generic_substances(id)
    on delete cascade,

  synonym text not null,
  normalized_synonym text not null,

  created_by uuid
    references public.profiles(id)
    on delete set null,

  created_at timestamptz not null default now(),

  constraint generic_synonyms_name_not_blank
    check (btrim(synonym) <> ''),

  constraint generic_synonyms_normalized_not_blank
    check (btrim(normalized_synonym) <> '')
);


create unique index if not exists
  generic_synonyms_normalized_unique_idx
on public.generic_synonyms(normalized_synonym);


create index if not exists
  generic_synonyms_substance_id_idx
on public.generic_synonyms(substance_id);


-- ============================================================
-- 5. AUTO-NORMALIZE SYNONYMS
-- ============================================================

create or replace function
public.set_generic_synonym_normalized_name()
returns trigger
language plpgsql
set search_path = public
as $$
begin

  new.synonym := btrim(new.synonym);

  new.normalized_synonym :=
    public.normalize_generic_term(new.synonym);

  if new.normalized_synonym = '' then
    raise exception 'Generic synonym cannot be empty';
  end if;

  return new;
end;
$$;


drop trigger if exists
  generic_synonyms_normalize_name
on public.generic_synonyms;


create trigger generic_synonyms_normalize_name
before insert or update of synonym
on public.generic_synonyms
for each row
execute function
  public.set_generic_synonym_normalized_name();


-- ============================================================
-- 6. PRODUCT INGREDIENT RELATIONSHIP
--
-- Supports:
--
-- Product A
--   -> Amoxicillin
--
-- Combination Product B
--   -> Amoxicillin
--   -> Clavulanic Acid
--
-- Legacy products.generic_name and composition remain unchanged.
-- ============================================================

create table if not exists public.product_ingredients (
  id uuid primary key default gen_random_uuid(),

  product_id uuid not null
    references public.products(id)
    on delete cascade,

  substance_id uuid not null
    references public.generic_substances(id)
    on delete restrict,

  ingredient_role text not null default 'active'
    check (
      ingredient_role in (
        'active',
        'nutritional',
        'functional',
        'excipient',
        'other'
      )
    ),

  strength_text text,
  unit text,

  sequence integer not null default 1
    check (sequence > 0),

  is_primary boolean not null default false,

  verification_status public.approval_status
    not null default 'pending'::public.approval_status,

  created_by uuid
    references public.profiles(id)
    on delete set null,

  verified_by uuid
    references public.profiles(id)
    on delete set null,

  verified_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint product_ingredients_product_substance_unique
    unique (product_id, substance_id)
);


create index if not exists
  product_ingredients_product_id_idx
on public.product_ingredients(product_id);


create index if not exists
  product_ingredients_substance_id_idx
on public.product_ingredients(substance_id);


-- ============================================================
-- 7. UPDATED_AT TRIGGERS
-- ============================================================

drop trigger if exists
  generic_substances_set_updated_at
on public.generic_substances;


create trigger generic_substances_set_updated_at
before update
on public.generic_substances
for each row
execute function public.set_updated_at();


drop trigger if exists
  product_ingredients_set_updated_at
on public.product_ingredients;


create trigger product_ingredients_set_updated_at
before update
on public.product_ingredients
for each row
execute function public.set_updated_at();


-- ============================================================
-- 8. RLS FOUNDATION
--
-- Foundation remains admin-managed for now.
-- Company/user request workflows come in the next permission phase.
-- ============================================================

alter table public.generic_substances enable row level security;
alter table public.generic_synonyms enable row level security;
alter table public.product_ingredients enable row level security;


drop policy if exists
  generic_substances_admin_foundation_access
on public.generic_substances;


create policy generic_substances_admin_foundation_access
on public.generic_substances
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());


drop policy if exists
  generic_synonyms_admin_foundation_access
on public.generic_synonyms;


create policy generic_synonyms_admin_foundation_access
on public.generic_synonyms
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());


drop policy if exists
  product_ingredients_admin_foundation_access
on public.product_ingredients;


create policy product_ingredients_admin_foundation_access
on public.product_ingredients
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());


-- ============================================================
-- 9. SAFE GENERIC DIRECTORY SEARCH
--
-- Only approved + active canonical records are exposed.
-- This will later power dropdown/autocomplete and generic pages.
-- ============================================================

create or replace function public.search_generic_substances(
  p_query text default null,
  p_limit integer default 20
)
returns table (
  substance_id uuid,
  canonical_name text,
  substance_type text
)
language sql
stable
security definer
set search_path = public
as $$
  select distinct
    gs.id,
    gs.canonical_name,
    gs.substance_type
  from public.generic_substances gs
  left join public.generic_synonyms syn
    on syn.substance_id = gs.id
  where gs.record_status = 'active'
    and gs.verification_status =
      'approved'::public.approval_status
    and (
      p_query is null
      or btrim(p_query) = ''
      or gs.canonical_name ilike
        '%' || btrim(p_query) || '%'
      or syn.synonym ilike
        '%' || btrim(p_query) || '%'
    )
  order by gs.canonical_name
  limit least(
    greatest(coalesce(p_limit, 20), 1),
    50
  );
$$;


revoke all on function
public.search_generic_substances(text, integer)
from public;


grant execute on function
public.search_generic_substances(text, integer)
to authenticated;


commit;
