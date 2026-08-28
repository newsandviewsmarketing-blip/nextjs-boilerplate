begin;

-- ============================================================
-- VetConnect
-- Product Evidence Foundation
--
-- Establishes document/source provenance for veterinary
-- product information without replacing existing:
--
-- products
-- product_regulatory
-- product_compliance
-- verification_records
--
-- Existing legacy evidence_path fields remain unchanged.
-- ============================================================


-- ============================================================
-- 1. PRODUCT EVIDENCE
--
-- One record = one supporting source/document.
--
-- Examples:
-- manufacturer label
-- approved regulatory label
-- registration certificate
-- trademark certificate
-- technical brochure
-- package insert
-- barcode evidence
-- official regulator source
-- ============================================================

create table if not exists public.product_evidence (
  id uuid primary key default gen_random_uuid(),

  product_id uuid not null
    references public.products(id)
    on delete cascade,

  variant_id uuid,

  evidence_type text not null,

  source_type text not null,

  title text,

  reference_number text,

  issuing_authority text,

  file_path text,

  external_url text,

  original_file_name text,

  mime_type text,

  file_size_bytes bigint,

  sha256 text,

  issue_date date,

  expiry_date date,

  document_language text,

  notes text,

  verification_status public.approval_status
    not null
    default 'pending'::public.approval_status,

  rejection_reason text,

  visibility public.profile_visibility
    not null
    default 'admin_only'::public.profile_visibility,

  is_current boolean
    not null
    default true,

  submitted_by uuid
    references public.profiles(id)
    on delete set null,

  verified_by uuid
    references public.profiles(id)
    on delete set null,

  verified_at timestamptz,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now(),

  constraint product_evidence_type_check
    check (
      evidence_type in (
        'manufacturer_label',
        'approved_label',
        'regulatory_certificate',
        'registration_record',
        'trademark_certificate',
        'barcode_evidence',
        'product_insert',
        'technical_brochure',
        'certificate_of_analysis',
        'company_declaration',
        'official_web_record',
        'other'
      )
    ),

  constraint product_evidence_source_type_check
    check (
      source_type in (
        'manufacturer',
        'registration_holder',
        'regulator',
        'company',
        'official_registry',
        'technical_document',
        'public_web',
        'admin_upload',
        'other'
      )
    ),

  constraint product_evidence_locator_check
    check (
      nullif(btrim(file_path), '') is not null
      or nullif(btrim(external_url), '') is not null
      or nullif(btrim(reference_number), '') is not null
    ),

  constraint product_evidence_file_size_check
    check (
      file_size_bytes is null
      or file_size_bytes >= 0
    ),

  constraint product_evidence_sha256_check
    check (
      sha256 is null
      or sha256 ~ '^[A-Fa-f0-9]{64}$'
    ),

  constraint product_evidence_date_check
    check (
      issue_date is null
      or expiry_date is null
      or expiry_date >= issue_date
    )
);


-- ============================================================
-- 2. VARIANT MUST BELONG TO PRODUCT
-- ============================================================

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.product_evidence'::regclass
      and conname = 'product_evidence_variant_product_fkey'
  ) then
    alter table public.product_evidence
      add constraint product_evidence_variant_product_fkey
      foreign key (
        variant_id,
        product_id
      )
      references public.product_variants(
        id,
        product_id
      )
      on update restrict
      on delete cascade;
  end if;
end
$$;


-- Needed for structured links from regulatory/compliance records.

create unique index if not exists
  product_evidence_id_product_id_unique_idx
on public.product_evidence(
  id,
  product_id
);


create index if not exists
  product_evidence_product_id_idx
on public.product_evidence(product_id);


create index if not exists
  product_evidence_variant_id_idx
on public.product_evidence(variant_id);


create index if not exists
  product_evidence_type_idx
on public.product_evidence(evidence_type);


create index if not exists
  product_evidence_verification_status_idx
on public.product_evidence(verification_status);


-- ============================================================
-- 3. FIELD-LEVEL EVIDENCE / PROVENANCE
--
-- Evidence authentication and field verification are separate.
--
-- Example:
--
-- Evidence:
-- DRAP approved product label
--
-- Claims:
-- composition
-- indications
-- dosage
-- withdrawal
-- registration_number
-- storage_instructions
--
-- This allows future field-level verification badges.
-- ============================================================

create table if not exists public.product_evidence_claims (
  id uuid primary key default gen_random_uuid(),

  evidence_id uuid not null,

  product_id uuid not null
    references public.products(id)
    on delete cascade,

  variant_id uuid,

  field_key text not null,

  claim_value text,

  source_locator text,

  is_primary boolean
    not null
    default false,

  verification_status public.approval_status
    not null
    default 'pending'::public.approval_status,

  rejection_reason text,

  created_by uuid
    references public.profiles(id)
    on delete set null,

  verified_by uuid
    references public.profiles(id)
    on delete set null,

  verified_at timestamptz,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now(),

  constraint product_evidence_claims_field_key_check
    check (
      nullif(btrim(field_key), '') is not null
    )
);


do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.product_evidence_claims'::regclass
      and conname =
        'product_evidence_claims_evidence_product_fkey'
  ) then
    alter table public.product_evidence_claims
      add constraint
        product_evidence_claims_evidence_product_fkey
      foreign key (
        evidence_id,
        product_id
      )
      references public.product_evidence(
        id,
        product_id
      )
      on delete cascade;
  end if;
end
$$;


do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.product_evidence_claims'::regclass
      and conname =
        'product_evidence_claims_variant_product_fkey'
  ) then
    alter table public.product_evidence_claims
      add constraint
        product_evidence_claims_variant_product_fkey
      foreign key (
        variant_id,
        product_id
      )
      references public.product_variants(
        id,
        product_id
      )
      on update restrict
      on delete cascade;
  end if;
end
$$;


create index if not exists
  product_evidence_claims_evidence_id_idx
on public.product_evidence_claims(evidence_id);


create index if not exists
  product_evidence_claims_product_id_idx
on public.product_evidence_claims(product_id);


create index if not exists
  product_evidence_claims_variant_id_idx
on public.product_evidence_claims(variant_id);


create index if not exists
  product_evidence_claims_field_key_idx
on public.product_evidence_claims(field_key);


create index if not exists
  product_evidence_claims_verification_status_idx
on public.product_evidence_claims(verification_status);


-- ============================================================
-- 4. LINK EXISTING REGULATORY RECORD TO STRUCTURED EVIDENCE
--
-- evidence_path remains untouched for backward compatibility.
-- ============================================================

alter table public.product_regulatory
  add column if not exists primary_evidence_id uuid;


do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.product_regulatory'::regclass
      and conname =
        'product_regulatory_primary_evidence_product_fkey'
  ) then
    alter table public.product_regulatory
      add constraint
        product_regulatory_primary_evidence_product_fkey
      foreign key (
        primary_evidence_id,
        product_id
      )
      references public.product_evidence(
        id,
        product_id
      )
      on delete set null;
  end if;
end
$$;


-- ============================================================
-- 5. LINK EXISTING COMPLIANCE RECORD TO STRUCTURED EVIDENCE
-- ============================================================

alter table public.product_compliance
  add column if not exists primary_evidence_id uuid;


do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.product_compliance'::regclass
      and conname =
        'product_compliance_primary_evidence_product_fkey'
  ) then
    alter table public.product_compliance
      add constraint
        product_compliance_primary_evidence_product_fkey
      foreign key (
        primary_evidence_id,
        product_id
      )
      references public.product_evidence(
        id,
        product_id
      )
      on delete set null;
  end if;
end
$$;


-- ============================================================
-- 6. PROTECT REVIEW / VERIFICATION FIELDS
--
-- Product owners may submit evidence.
-- They may not approve their own evidence.
-- ============================================================

create or replace function
public.protect_product_evidence_review_fields()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_can_review boolean;
begin

  -- Trusted database/service operations are not blocked.
  if auth.uid() is null then
    return new;
  end if;


  v_can_review :=
    coalesce(public.is_admin(), false)
    or coalesce(public.can_verify(), false);


  if v_can_review then
    return new;
  end if;


  if tg_op = 'INSERT' then

    if new.verification_status
       <> 'pending'::public.approval_status
       or new.verified_by is not null
       or new.verified_at is not null
       or new.rejection_reason is not null
    then
      raise exception
        'Verification fields may only be set by an authorized reviewer';
    end if;

  else

    if new.verification_status
         is distinct from old.verification_status
       or new.verified_by
         is distinct from old.verified_by
       or new.verified_at
         is distinct from old.verified_at
       or new.rejection_reason
         is distinct from old.rejection_reason
    then
      raise exception
        'Verification fields may only be changed by an authorized reviewer';
    end if;

  end if;


  return new;
end;
$$;


drop trigger if exists
  product_evidence_protect_review
on public.product_evidence;


create trigger product_evidence_protect_review
before insert or update
on public.product_evidence
for each row
execute function
  public.protect_product_evidence_review_fields();


-- ============================================================
-- 7. PROTECT CLAIM VERIFICATION FIELDS
-- ============================================================

create or replace function
public.protect_product_evidence_claim_review_fields()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_can_review boolean;
begin

  if auth.uid() is null then
    return new;
  end if;


  v_can_review :=
    coalesce(public.is_admin(), false)
    or coalesce(public.can_verify(), false);


  if v_can_review then
    return new;
  end if;


  if tg_op = 'INSERT' then

    if new.verification_status
       <> 'pending'::public.approval_status
       or new.verified_by is not null
       or new.verified_at is not null
       or new.rejection_reason is not null
    then
      raise exception
        'Claim verification fields may only be set by an authorized reviewer';
    end if;

  else

    if new.verification_status
         is distinct from old.verification_status
       or new.verified_by
         is distinct from old.verified_by
       or new.verified_at
         is distinct from old.verified_at
       or new.rejection_reason
         is distinct from old.rejection_reason
    then
      raise exception
        'Claim verification fields may only be changed by an authorized reviewer';
    end if;

  end if;


  return new;
end;
$$;


drop trigger if exists
  product_evidence_claims_protect_review
on public.product_evidence_claims;


create trigger product_evidence_claims_protect_review
before insert or update
on public.product_evidence_claims
for each row
execute function
  public.protect_product_evidence_claim_review_fields();


-- ============================================================
-- 8. UPDATED_AT
-- ============================================================

drop trigger if exists
  product_evidence_set_updated_at
on public.product_evidence;


create trigger product_evidence_set_updated_at
before update
on public.product_evidence
for each row
execute function public.set_updated_at();


drop trigger if exists
  product_evidence_claims_set_updated_at
on public.product_evidence_claims;


create trigger product_evidence_claims_set_updated_at
before update
on public.product_evidence_claims
for each row
execute function public.set_updated_at();


-- ============================================================
-- 9. ROW LEVEL SECURITY
--
-- Foundation is intentionally private.
-- Public evidence presentation will be added later through a
-- controlled verified/public view.
-- ============================================================

alter table public.product_evidence
  enable row level security;

alter table public.product_evidence_claims
  enable row level security;


-- ------------------------------------------------------------
-- PRODUCT EVIDENCE SELECT
-- ------------------------------------------------------------

drop policy if exists
  product_evidence_select_relevant
on public.product_evidence;


create policy product_evidence_select_relevant
on public.product_evidence
for select
to authenticated
using (
  exists (
    select 1
    from public.products p
    where p.id = product_evidence.product_id
      and p.company_user_id = auth.uid()
  )
  or public.is_admin()
  or public.can_verify()
  or public.can_manage_content()
);


-- ------------------------------------------------------------
-- PRODUCT EVIDENCE INSERT
-- ------------------------------------------------------------

drop policy if exists
  product_evidence_insert_authorized
on public.product_evidence;


create policy product_evidence_insert_authorized
on public.product_evidence
for insert
to authenticated
with check (
  exists (
    select 1
    from public.products p
    where p.id = product_evidence.product_id
      and p.company_user_id = auth.uid()
  )
  or public.is_admin()
  or public.can_verify()
  or public.can_manage_content()
);


-- ------------------------------------------------------------
-- PRODUCT EVIDENCE UPDATE
--
-- Owners/content managers may edit only unapproved evidence.
-- Reviewers/admins may manage review state.
-- ------------------------------------------------------------

drop policy if exists
  product_evidence_update_authorized
on public.product_evidence;


create policy product_evidence_update_authorized
on public.product_evidence
for update
to authenticated
using (
  (
    (
      exists (
        select 1
        from public.products p
        where p.id = product_evidence.product_id
          and p.company_user_id = auth.uid()
      )
      or public.can_manage_content()
    )
    and verification_status
        <> 'approved'::public.approval_status
  )
  or public.is_admin()
  or public.can_verify()
)
with check (
  (
    (
      exists (
        select 1
        from public.products p
        where p.id = product_evidence.product_id
          and p.company_user_id = auth.uid()
      )
      or public.can_manage_content()
    )
    and verification_status
        <> 'approved'::public.approval_status
  )
  or public.is_admin()
  or public.can_verify()
);


-- ------------------------------------------------------------
-- PRODUCT EVIDENCE DELETE
-- ------------------------------------------------------------

drop policy if exists
  product_evidence_delete_authorized
on public.product_evidence;


create policy product_evidence_delete_authorized
on public.product_evidence
for delete
to authenticated
using (
  (
    (
      exists (
        select 1
        from public.products p
        where p.id = product_evidence.product_id
          and p.company_user_id = auth.uid()
      )
      or public.can_manage_content()
    )
    and verification_status
        <> 'approved'::public.approval_status
  )
  or public.is_admin()
);


-- ------------------------------------------------------------
-- CLAIM SELECT
-- ------------------------------------------------------------

drop policy if exists
  product_evidence_claims_select_relevant
on public.product_evidence_claims;


create policy product_evidence_claims_select_relevant
on public.product_evidence_claims
for select
to authenticated
using (
  exists (
    select 1
    from public.product_evidence pe
    where pe.id = product_evidence_claims.evidence_id
  )
);


-- ------------------------------------------------------------
-- CLAIM INSERT
-- ------------------------------------------------------------

drop policy if exists
  product_evidence_claims_insert_authorized
on public.product_evidence_claims;


create policy product_evidence_claims_insert_authorized
on public.product_evidence_claims
for insert
to authenticated
with check (
  exists (
    select 1
    from public.product_evidence pe
    join public.products p
      on p.id = pe.product_id
    where pe.id = product_evidence_claims.evidence_id
      and (
        p.company_user_id = auth.uid()
        or public.is_admin()
        or public.can_verify()
        or public.can_manage_content()
      )
  )
);


-- ------------------------------------------------------------
-- CLAIM UPDATE
-- ------------------------------------------------------------

drop policy if exists
  product_evidence_claims_update_authorized
on public.product_evidence_claims;


create policy product_evidence_claims_update_authorized
on public.product_evidence_claims
for update
to authenticated
using (
  (
    (
      exists (
        select 1
        from public.products p
        where p.id = product_evidence_claims.product_id
          and p.company_user_id = auth.uid()
      )
      or public.can_manage_content()
    )
    and verification_status
        <> 'approved'::public.approval_status
  )
  or public.is_admin()
  or public.can_verify()
)
with check (
  (
    (
      exists (
        select 1
        from public.products p
        where p.id = product_evidence_claims.product_id
          and p.company_user_id = auth.uid()
      )
      or public.can_manage_content()
    )
    and verification_status
        <> 'approved'::public.approval_status
  )
  or public.is_admin()
  or public.can_verify()
);


-- ------------------------------------------------------------
-- CLAIM DELETE
-- ------------------------------------------------------------

drop policy if exists
  product_evidence_claims_delete_authorized
on public.product_evidence_claims;


create policy product_evidence_claims_delete_authorized
on public.product_evidence_claims
for delete
to authenticated
using (
  (
    (
      exists (
        select 1
        from public.products p
        where p.id = product_evidence_claims.product_id
          and p.company_user_id = auth.uid()
      )
      or public.can_manage_content()
    )
    and verification_status
        <> 'approved'::public.approval_status
  )
  or public.is_admin()
);


-- ============================================================
-- 10. GRANTS
-- ============================================================

grant select, insert, update, delete
on public.product_evidence
to authenticated;


grant select, insert, update, delete
on public.product_evidence_claims
to authenticated;


commit;
