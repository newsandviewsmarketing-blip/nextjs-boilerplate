begin;

-- ============================================================
-- VetConnect
-- Product Evidence FK Hardening
--
-- Preserves product_id when linked evidence or variants
-- are removed.
-- ============================================================


-- ============================================================
-- 1. PRODUCT REGULATORY PRIMARY EVIDENCE
-- ============================================================

alter table public.product_regulatory
  drop constraint if exists
    product_regulatory_primary_evidence_product_fkey;

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
  on delete set null (primary_evidence_id);


-- ============================================================
-- 2. PRODUCT COMPLIANCE PRIMARY EVIDENCE
-- ============================================================

alter table public.product_compliance
  drop constraint if exists
    product_compliance_primary_evidence_product_fkey;

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
  on delete set null (primary_evidence_id);


-- ============================================================
-- 3. PRODUCT EVIDENCE VARIANT LINK
--
-- If a variant is removed, keep the evidence record attached
-- to the product and clear only variant_id.
-- ============================================================

alter table public.product_evidence
  drop constraint if exists
    product_evidence_variant_product_fkey;

alter table public.product_evidence
  add constraint
    product_evidence_variant_product_fkey
  foreign key (
    variant_id,
    product_id
  )
  references public.product_variants(
    id,
    product_id
  )
  on update restrict
  on delete set null (variant_id);


-- ============================================================
-- 4. PRODUCT EVIDENCE CLAIM VARIANT LINK
--
-- If a variant is removed, keep the provenance claim attached
-- to the product and clear only variant_id.
-- ============================================================

alter table public.product_evidence_claims
  drop constraint if exists
    product_evidence_claims_variant_product_fkey;

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
  on delete set null (variant_id);


commit;
