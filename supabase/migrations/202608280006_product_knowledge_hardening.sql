begin;

-- ============================================================
-- VetConnect
-- Product Knowledge Hardening
--
-- V1 scientific product foundation:
-- 1. Substance parent / chemical-form relationships
-- 2. Safe synonym model
-- 3. Variant-aware structured composition
-- 4. Product / variant integrity
-- 5. Parent-cycle and measurement integrity protection
--
-- Existing products and legacy fields remain unchanged.
-- ============================================================


-- ============================================================
-- 1. SUBSTANCE / CHEMICAL-FORM RELATIONSHIPS
-- ============================================================

alter table public.generic_substances
  add column if not exists parent_substance_id uuid;

alter table public.generic_substances
  add column if not exists substance_relationship_type text;


do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.generic_substances'::regclass
      and conname = 'generic_substances_parent_substance_id_fkey'
  ) then
    alter table public.generic_substances
      add constraint generic_substances_parent_substance_id_fkey
      foreign key (parent_substance_id)
      references public.generic_substances(id)
      on delete restrict;
  end if;
end
$$;


do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.generic_substances'::regclass
      and conname = 'generic_substances_relationship_shape_check'
  ) then
    alter table public.generic_substances
      add constraint generic_substances_relationship_shape_check
      check (
        (
          parent_substance_id is null
          and substance_relationship_type is null
        )
        or
        (
          parent_substance_id is not null
          and substance_relationship_type in (
            'salt_of',
            'ester_of',
            'hydrate_of',
            'derivative_of',
            'form_of',
            'strain_of',
            'extract_of',
            'other'
          )
        )
      );
  end if;
end
$$;


do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.generic_substances'::regclass
      and conname = 'generic_substances_no_self_parent_check'
  ) then
    alter table public.generic_substances
      add constraint generic_substances_no_self_parent_check
      check (
        parent_substance_id is null
        or parent_substance_id <> id
      );
  end if;
end
$$;


create index if not exists
  generic_substances_parent_substance_idx
on public.generic_substances(parent_substance_id);


-- ============================================================
-- 2. PREVENT PARENT RELATIONSHIP CYCLES
--
-- Example blocked:
--
-- A -> B
-- B -> C
-- C -> A
-- ============================================================

create or replace function
public.validate_generic_substance_parent()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_cursor uuid;
  v_depth integer := 0;
begin

  if new.parent_substance_id is null then
    return new;
  end if;


  if new.parent_substance_id = new.id then
    raise exception
      'A substance cannot be its own parent';
  end if;


  v_cursor := new.parent_substance_id;


  while v_cursor is not null loop

    if v_cursor = new.id then
      raise exception
        'Substance parent relationship would create a cycle';
    end if;


    select gs.parent_substance_id
    into v_cursor
    from public.generic_substances gs
    where gs.id = v_cursor;


    if not found then
      exit;
    end if;


    v_depth := v_depth + 1;

    if v_depth > 100 then
      raise exception
        'Substance parent hierarchy is unexpectedly deep';
    end if;

  end loop;


  return new;
end;
$$;


drop trigger if exists
  generic_substances_validate_parent
on public.generic_substances;


create trigger generic_substances_validate_parent
before insert or update of
  parent_substance_id,
  substance_relationship_type
on public.generic_substances
for each row
execute function
  public.validate_generic_substance_parent();


-- ============================================================
-- 3. SYNONYM MODEL
--
-- Canonical normalized names remain globally unique.
--
-- Synonym uniqueness becomes scoped to a substance because
-- a search/common term may legitimately refer to more than
-- one scientific concept.
-- ============================================================

drop index if exists
  public.generic_synonyms_normalized_unique_idx;


create unique index if not exists
  generic_synonyms_substance_normalized_unique_idx
on public.generic_synonyms(
  substance_id,
  normalized_synonym
);


-- Replace the original synonym normalization trigger with
-- one authoritative normalize + validate trigger.

drop trigger if exists
  generic_synonyms_normalize_name
on public.generic_synonyms;


create or replace function
public.normalize_and_validate_generic_synonym()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_canonical_normalized text;
begin

  new.synonym := btrim(new.synonym);

  new.normalized_synonym :=
    public.normalize_generic_term(new.synonym);


  if new.normalized_synonym = '' then
    raise exception
      'Generic synonym cannot be empty';
  end if;


  select gs.normalized_name
  into v_canonical_normalized
  from public.generic_substances gs
  where gs.id = new.substance_id;


  if not found then
    raise exception
      'Canonical substance not found';
  end if;


  if v_canonical_normalized = new.normalized_synonym then
    raise exception
      'Synonym duplicates the canonical name of the same substance';
  end if;


  return new;
end;
$$;


drop trigger if exists
  generic_synonyms_normalize_validate
on public.generic_synonyms;


create trigger generic_synonyms_normalize_validate
before insert or update of
  synonym,
  normalized_synonym,
  substance_id
on public.generic_synonyms
for each row
execute function
  public.normalize_and_validate_generic_synonym();


-- ============================================================
-- 4. CANONICAL NAME VALIDATION
--
-- Keep canonical normalized_name authoritative and prevent
-- renaming a canonical substance to one of its own synonyms.
-- ============================================================

drop trigger if exists
  generic_substances_normalize_name
on public.generic_substances;


create or replace function
public.normalize_and_validate_generic_substance()
returns trigger
language plpgsql
set search_path = public
as $$
begin

  new.canonical_name := btrim(new.canonical_name);

  new.normalized_name :=
    public.normalize_generic_term(new.canonical_name);


  if new.normalized_name = '' then
    raise exception
      'Generic/substance name cannot be empty';
  end if;


  if exists (
    select 1
    from public.generic_synonyms syn
    where syn.substance_id = new.id
      and syn.normalized_synonym = new.normalized_name
  ) then
    raise exception
      'Canonical name duplicates an existing synonym of the same substance';
  end if;


  return new;
end;
$$;


drop trigger if exists
  generic_substances_normalize_validate
on public.generic_substances;


create trigger generic_substances_normalize_validate
before insert or update of
  canonical_name,
  normalized_name
on public.generic_substances
for each row
execute function
  public.normalize_and_validate_generic_substance();


-- ============================================================
-- 5. VARIANT-AWARE STRUCTURED COMPOSITION
--
-- Examples supported:
--
-- 500 mg / 1 g
-- 5 g / 100 g
-- 5,000,000 IU / 1 g
-- 10,000 FTU / kg
-- 1,000,000,000 CFU / g
--
-- label_expression preserves manufacturer wording.
-- ============================================================

alter table public.product_ingredients
  add column if not exists variant_id uuid;

alter table public.product_ingredients
  add column if not exists amount_value numeric;

alter table public.product_ingredients
  add column if not exists amount_unit text;

alter table public.product_ingredients
  add column if not exists basis_value numeric;

alter table public.product_ingredients
  add column if not exists basis_unit text;

alter table public.product_ingredients
  add column if not exists label_expression text;


do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.product_ingredients'::regclass
      and conname = 'product_ingredients_variant_id_fkey'
  ) then
    alter table public.product_ingredients
      add constraint product_ingredients_variant_id_fkey
      foreign key (variant_id)
      references public.product_variants(id)
      on delete cascade;
  end if;
end
$$;


do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.product_ingredients'::regclass
      and conname = 'product_ingredients_amount_positive_check'
  ) then
    alter table public.product_ingredients
      add constraint product_ingredients_amount_positive_check
      check (
        amount_value is null
        or amount_value > 0
      );
  end if;
end
$$;


do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.product_ingredients'::regclass
      and conname = 'product_ingredients_basis_positive_check'
  ) then
    alter table public.product_ingredients
      add constraint product_ingredients_basis_positive_check
      check (
        basis_value is null
        or basis_value > 0
      );
  end if;
end
$$;


-- ============================================================
-- 6. MEASUREMENT SHAPE INTEGRITY
--
-- Prevent:
-- amount_value = 500, amount_unit = NULL
--
-- or:
-- basis_value = NULL, basis_unit = 'g'
-- ============================================================

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.product_ingredients'::regclass
      and conname = 'product_ingredients_amount_unit_shape_check'
  ) then
    alter table public.product_ingredients
      add constraint product_ingredients_amount_unit_shape_check
      check (
        (
          amount_value is null
          and nullif(btrim(amount_unit), '') is null
        )
        or
        (
          amount_value is not null
          and nullif(btrim(amount_unit), '') is not null
        )
      );
  end if;
end
$$;


do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.product_ingredients'::regclass
      and conname = 'product_ingredients_basis_unit_shape_check'
  ) then
    alter table public.product_ingredients
      add constraint product_ingredients_basis_unit_shape_check
      check (
        (
          basis_value is null
          and nullif(btrim(basis_unit), '') is null
        )
        or
        (
          basis_value is not null
          and nullif(btrim(basis_unit), '') is not null
        )
      );
  end if;
end
$$;


-- ============================================================
-- 7. PRODUCT / VARIANT INGREDIENT UNIQUENESS
-- ============================================================

alter table public.product_ingredients
  drop constraint if exists
    product_ingredients_product_substance_unique;


-- Product-level composition

create unique index if not exists
  product_ingredients_product_substance_unique_idx
on public.product_ingredients(
  product_id,
  substance_id
)
where variant_id is null;


-- Variant-specific composition

create unique index if not exists
  product_ingredients_variant_substance_unique_idx
on public.product_ingredients(
  variant_id,
  substance_id
)
where variant_id is not null;


create index if not exists
  product_ingredients_variant_id_idx
on public.product_ingredients(variant_id);

-- ============================================================
-- 8. DATABASE-LEVEL VARIANT / PRODUCT INTEGRITY
--
-- A variant-linked ingredient must always reference the
-- same product that owns the selected variant.
--
-- This protects integrity even if product_variants.product_id
-- is later changed directly.
-- ============================================================

create unique index if not exists
  product_variants_id_product_id_unique_idx
on public.product_variants(
  id,
  product_id
);


do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.product_ingredients'::regclass
      and conname = 'product_ingredients_variant_product_fkey'
  ) then
    alter table public.product_ingredients
      add constraint product_ingredients_variant_product_fkey
      foreign key (
        variant_id,
        product_id
      )
      references public.product_variants(
        id,
        product_id
      )
      on update restrict;
  end if;
end
$$;

-- ============================================================
-- 9. GUARANTEE VARIANT BELONGS TO PRODUCT
-- ============================================================

create or replace function
public.validate_product_ingredient_variant()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_variant_product_id uuid;
begin

  if new.variant_id is null then
    return new;
  end if;


  select pv.product_id
  into v_variant_product_id
  from public.product_variants pv
  where pv.id = new.variant_id;


  if not found then
    raise exception
      'Product variant not found';
  end if;


  if v_variant_product_id <> new.product_id then
    raise exception
      'Selected variant does not belong to the selected product';
  end if;


  return new;
end;
$$;


drop trigger if exists
  product_ingredients_validate_variant
on public.product_ingredients;


create trigger product_ingredients_validate_variant
before insert or update of
  product_id,
  variant_id
on public.product_ingredients
for each row
execute function
  public.validate_product_ingredient_variant();


commit;
