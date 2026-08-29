begin;

-- ============================================================
-- VetConnect
-- 010 V1 COMPANY WORKSPACE BRIDGE
--
-- Purpose:
-- Bridge existing legacy company_user_id based tables to the
-- canonical companies + company_members permission system.
--
-- V1 strategy:
-- - Preserve existing legacy columns and data.
-- - Do not rebuild product/company tables.
-- - Authorize members through canonical company membership.
-- - Keep existing admin / verification controls.
--
-- Future Phase 2 may fully normalize these tables to company_id.
-- ============================================================


-- ============================================================
-- 1. LEGACY COMPANY USER -> CANONICAL COMPANY
-- ============================================================

create or replace function public.company_id_from_legacy_user(
  p_legacy_company_user_id uuid
)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.id
  from public.companies c
  where c.legacy_company_user_id = p_legacy_company_user_id
    and c.record_status = 'active'
  limit 1;
$$;

revoke all
on function public.company_id_from_legacy_user(uuid)
from public;

grant execute
on function public.company_id_from_legacy_user(uuid)
to authenticated;

grant execute
on function public.company_id_from_legacy_user(uuid)
to service_role;


-- ============================================================
-- 2. CANONICAL PERMISSION BRIDGE FOR LEGACY TABLES
-- ============================================================

create or replace function public.legacy_company_has_permission(
  p_legacy_company_user_id uuid,
  p_permission text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_account_active(auth.uid())
    and exists (
      select 1
      from public.companies c
      where c.legacy_company_user_id =
        p_legacy_company_user_id
        and c.record_status = 'active'
        and public.company_has_permission(
          c.id,
          p_permission
        )
    );
$$;

revoke all
on function public.legacy_company_has_permission(uuid, text)
from public;

grant execute
on function public.legacy_company_has_permission(uuid, text)
to authenticated;

grant execute
on function public.legacy_company_has_permission(uuid, text)
to service_role;


-- ============================================================
-- 3. CURRENT USER COMPANY WORKSPACES
--
-- Frontend can use this controlled function to resolve:
-- canonical company id
-- legacy company profile id
-- member role
-- permissions
-- ============================================================

create or replace function public.get_my_company_workspaces()
returns table (
  company_id uuid,
  legacy_company_user_id uuid,
  canonical_name text,
  company_verification_status text,
  member_role text,
  designation text,
  permissions text[]
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.legacy_company_user_id,
    c.canonical_name,
    c.verification_status::text,
    cm.member_role,
    cm.designation,
    cm.permissions
  from public.company_members cm
  join public.companies c
    on c.id = cm.company_id
  where cm.user_id = auth.uid()
    and public.is_account_active(auth.uid())
    and cm.membership_status = 'active'
    and cm.verification_status =
      'approved'::public.approval_status
    and cm.is_current = true
    and c.record_status = 'active'
  order by
    cm.is_primary desc,
    c.canonical_name;
$$;

revoke all
on function public.get_my_company_workspaces()
from public;

grant execute
on function public.get_my_company_workspaces()
to authenticated;


-- ============================================================
-- 4. COMPANY PROFILE
-- ============================================================

drop policy if exists
  companies_owner_or_admin_select
on public.company_profiles;

create policy companies_owner_or_admin_select
on public.company_profiles
for select
to authenticated
using (
  public.legacy_company_has_permission(
    user_id,
    'company.view_private'
  )
  or public.legacy_company_has_permission(
    user_id,
    'company.manage'
  )
  or public.is_admin()
);


drop policy if exists
  companies_owner_or_admin_update
on public.company_profiles;

create policy companies_owner_or_admin_update
on public.company_profiles
for update
to authenticated
using (
  public.legacy_company_has_permission(
    user_id,
    'company.manage'
  )
  or public.is_admin()
)
with check (
  public.legacy_company_has_permission(
    user_id,
    'company.manage'
  )
  or public.is_admin()
);


-- ============================================================
-- 5. COMPANY MASTER DATA
-- ============================================================

drop policy if exists
  company_roles_owner_or_admin
on public.company_roles;

create policy company_roles_owner_or_admin
on public.company_roles
for all
to authenticated
using (
  public.legacy_company_has_permission(
    company_user_id,
    'company.manage'
  )
  or public.is_admin()
)
with check (
  public.legacy_company_has_permission(
    company_user_id,
    'company.manage'
  )
  or public.is_admin()
);


drop policy if exists
  company_sectors_owner_or_admin
on public.company_sectors;

create policy company_sectors_owner_or_admin
on public.company_sectors
for all
to authenticated
using (
  public.legacy_company_has_permission(
    company_user_id,
    'company.manage'
  )
  or public.is_admin()
)
with check (
  public.legacy_company_has_permission(
    company_user_id,
    'company.manage'
  )
  or public.is_admin()
);


drop policy if exists
  company_locations_owner_or_admin
on public.company_locations;

create policy company_locations_owner_or_admin
on public.company_locations
for all
to authenticated
using (
  public.legacy_company_has_permission(
    company_user_id,
    'company.manage'
  )
  or public.is_admin()
)
with check (
  public.legacy_company_has_permission(
    company_user_id,
    'company.manage'
  )
  or public.is_admin()
);


drop policy if exists
  company_contacts_owner_or_admin
on public.company_contacts;

create policy company_contacts_owner_or_admin
on public.company_contacts
for all
to authenticated
using (
  public.legacy_company_has_permission(
    company_user_id,
    'company.manage'
  )
  or public.is_admin()
)
with check (
  public.legacy_company_has_permission(
    company_user_id,
    'company.manage'
  )
  or public.is_admin()
);


drop policy if exists
  company_documents_owner_or_admin
on public.company_documents;

create policy company_documents_owner_or_admin
on public.company_documents
for all
to authenticated
using (
  public.legacy_company_has_permission(
    company_user_id,
    'company.manage'
  )
  or public.is_admin()
)
with check (
  public.legacy_company_has_permission(
    company_user_id,
    'company.manage'
  )
  or public.is_admin()
);


-- ============================================================
-- 6. COMPANY RELATIONSHIPS
-- Existing source_company_id / target_company_id are legacy
-- company-profile user IDs.
-- ============================================================

drop policy if exists
  company_relationships_party_or_admin
on public.company_relationships;


create policy company_relationships_select_parties
on public.company_relationships
for select
to authenticated
using (
  public.legacy_company_has_permission(
    source_company_id,
    'company.view_private'
  )
  or public.legacy_company_has_permission(
    source_company_id,
    'company.manage'
  )
  or public.legacy_company_has_permission(
    target_company_id,
    'company.view_private'
  )
  or public.legacy_company_has_permission(
    target_company_id,
    'company.manage'
  )
  or public.is_admin()
);


create policy company_relationships_insert_source
on public.company_relationships
for insert
to authenticated
with check (
  public.legacy_company_has_permission(
    source_company_id,
    'company.manage'
  )
  or public.is_admin()
);


create policy company_relationships_update_source
on public.company_relationships
for update
to authenticated
using (
  public.legacy_company_has_permission(
    source_company_id,
    'company.manage'
  )
  or public.is_admin()
)
with check (
  public.legacy_company_has_permission(
    source_company_id,
    'company.manage'
  )
  or public.is_admin()
);


create policy company_relationships_delete_source
on public.company_relationships
for delete
to authenticated
using (
  public.legacy_company_has_permission(
    source_company_id,
    'company.manage'
  )
  or public.is_admin()
);


-- ============================================================
-- 7. PRODUCTS
-- ============================================================

drop policy if exists
  products_owner_or_admin_update
on public.products;

create policy products_owner_or_admin_update
on public.products
for update
to authenticated
using (
  public.legacy_company_has_permission(
    company_user_id,
    'products.manage'
  )
  or public.is_admin()
)
with check (
  public.legacy_company_has_permission(
    company_user_id,
    'products.manage'
  )
  or public.is_admin()
);


drop policy if exists
  products_pending_owner_or_admin_delete
on public.products;

create policy products_pending_owner_or_admin_delete
on public.products
for delete
to authenticated
using (
  (
    public.legacy_company_has_permission(
      company_user_id,
      'products.manage'
    )
    and verification_status <>
      'approved'::public.approval_status
  )
  or public.is_admin()
);


drop policy if exists
  products_public_owner_or_admin_select
on public.products;

create policy products_public_owner_or_admin_select
on public.products
for select
to authenticated
using (
  (
    verification_status =
      'approved'::public.approval_status
    and is_published = true
  )
  or public.legacy_company_has_permission(
    company_user_id,
    'products.manage'
  )
  or public.is_admin()
);


drop policy if exists
  products_verified_company_insert
on public.products;

create policy products_verified_company_insert
on public.products
for insert
to authenticated
with check (
  (
    public.legacy_company_has_permission(
      company_user_id,
      'products.manage'
    )
    and exists (
      select 1
      from public.companies c
      where c.legacy_company_user_id =
        products.company_user_id
        and c.record_status = 'active'
        and c.verification_status =
          'approved'::public.approval_status
    )
    and verification_status =
      'pending'::public.approval_status
    and is_published = false
  )
  or public.is_admin()
);


-- ============================================================
-- 8. PRODUCT COMPLIANCE
-- ============================================================

drop policy if exists
  product_compliance_owner_or_admin_select
on public.product_compliance;

create policy product_compliance_owner_or_admin_select
on public.product_compliance
for select
to authenticated
using (
  public.legacy_company_has_permission(
    company_user_id,
    'products.manage'
  )
  or public.is_admin()
);


drop policy if exists
  product_compliance_owner_or_admin_insert
on public.product_compliance;

create policy product_compliance_owner_or_admin_insert
on public.product_compliance
for insert
to authenticated
with check (
  (
    public.legacy_company_has_permission(
      company_user_id,
      'products.manage'
    )
    and exists (
      select 1
      from public.products p
      where p.id = product_compliance.product_id
        and p.company_user_id =
          product_compliance.company_user_id
    )
  )
  or public.is_admin()
);


drop policy if exists
  product_compliance_owner_or_admin_update
on public.product_compliance;

create policy product_compliance_owner_or_admin_update
on public.product_compliance
for update
to authenticated
using (
  public.legacy_company_has_permission(
    company_user_id,
    'products.manage'
  )
  or public.is_admin()
)
with check (
  public.legacy_company_has_permission(
    company_user_id,
    'products.manage'
  )
  or public.is_admin()
);


drop policy if exists
  product_compliance_owner_or_admin_delete
on public.product_compliance;

create policy product_compliance_owner_or_admin_delete
on public.product_compliance
for delete
to authenticated
using (
  public.legacy_company_has_permission(
    company_user_id,
    'products.manage'
  )
  or public.is_admin()
);


-- ============================================================
-- 9. PRODUCT INQUIRIES
--
-- Requester insert policy remains unchanged.
-- ============================================================

drop policy if exists
  inquiries_company_or_admin_update
on public.product_inquiries;

create policy inquiries_company_or_admin_update
on public.product_inquiries
for update
to authenticated
using (
  public.legacy_company_has_permission(
    company_user_id,
    'products.manage'
  )
  or public.is_admin()
)
with check (
  public.legacy_company_has_permission(
    company_user_id,
    'products.manage'
  )
  or public.is_admin()
);


drop policy if exists
  inquiries_parties_or_admin_select
on public.product_inquiries;

create policy inquiries_parties_or_admin_select
on public.product_inquiries
for select
to authenticated
using (
  requester_id = auth.uid()
  or public.legacy_company_has_permission(
    company_user_id,
    'products.manage'
  )
  or public.is_admin()
);


-- ============================================================
-- 10. PRODUCT REGULATORY
-- Verification policy remains unchanged.
-- ============================================================

drop policy if exists
  product_regulatory_owner_or_admin
on public.product_regulatory;

create policy product_regulatory_owner_or_admin
on public.product_regulatory
for all
to authenticated
using (
  public.legacy_company_has_permission(
    company_user_id,
    'products.manage'
  )
  or public.is_admin()
)
with check (
  public.legacy_company_has_permission(
    company_user_id,
    'products.manage'
  )
  or public.is_admin()
);


-- ============================================================
-- 11. PRODUCT-COMPANY RELATIONSHIPS
-- ============================================================

drop policy if exists
  product_company_relationship_owner_or_admin
on public.product_company_relationships;

create policy product_company_relationship_owner_or_admin
on public.product_company_relationships
for all
to authenticated
using (
  public.legacy_company_has_permission(
    company_user_id,
    'products.manage'
  )
  or public.is_admin()
)
with check (
  public.legacy_company_has_permission(
    company_user_id,
    'products.manage'
  )
  or public.is_admin()
);


-- ============================================================
-- 12. PRODUCT VARIANTS
-- ============================================================

drop policy if exists
  product_variants_owner_or_admin
on public.product_variants;

create policy product_variants_owner_or_admin
on public.product_variants
for all
to authenticated
using (
  exists (
    select 1
    from public.products p
    where p.id = product_variants.product_id
      and (
        public.legacy_company_has_permission(
          p.company_user_id,
          'products.manage'
        )
        or public.is_admin()
      )
  )
)
with check (
  exists (
    select 1
    from public.products p
    where p.id = product_variants.product_id
      and (
        public.legacy_company_has_permission(
          p.company_user_id,
          'products.manage'
        )
        or public.is_admin()
      )
  )
);


-- ============================================================
-- 13. PRODUCT MEDIA
-- ============================================================

drop policy if exists
  product_media_owner_manage
on public.product_media;

create policy product_media_owner_manage
on public.product_media
for all
to authenticated
using (
  exists (
    select 1
    from public.products p
    where p.id = product_media.product_id
      and (
        public.legacy_company_has_permission(
          p.company_user_id,
          'products.manage'
        )
        or public.is_admin()
      )
  )
)
with check (
  exists (
    select 1
    from public.products p
    where p.id = product_media.product_id
      and (
        public.legacy_company_has_permission(
          p.company_user_id,
          'products.manage'
        )
        or public.is_admin()
      )
  )
);


drop policy if exists
  product_media_public_or_owner
on public.product_media;

create policy product_media_public_or_owner
on public.product_media
for select
to authenticated
using (
  (
    is_public = true
    and exists (
      select 1
      from public.products p
      where p.id = product_media.product_id
        and p.verification_status =
          'approved'::public.approval_status
        and p.is_published = true
    )
  )
  or exists (
    select 1
    from public.products p
    where p.id = product_media.product_id
      and (
        public.legacy_company_has_permission(
          p.company_user_id,
          'products.manage'
        )
        or public.is_admin()
      )
  )
);


-- ============================================================
-- 14. PRODUCT EVIDENCE
-- ============================================================

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
      and public.legacy_company_has_permission(
        p.company_user_id,
        'products.manage'
      )
  )
  or public.is_admin()
  or public.can_verify()
  or public.can_manage_content()
);


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
      and public.legacy_company_has_permission(
        p.company_user_id,
        'products.manage'
      )
  )
  or public.is_admin()
  or public.can_verify()
  or public.can_manage_content()
);


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
          and public.legacy_company_has_permission(
            p.company_user_id,
            'products.manage'
          )
      )
      or public.can_manage_content()
    )
    and verification_status <>
      'approved'::public.approval_status
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
          and public.legacy_company_has_permission(
            p.company_user_id,
            'products.manage'
          )
      )
      or public.can_manage_content()
    )
    and verification_status <>
      'approved'::public.approval_status
  )
  or public.is_admin()
  or public.can_verify()
);


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
          and public.legacy_company_has_permission(
            p.company_user_id,
            'products.manage'
          )
      )
      or public.can_manage_content()
    )
    and verification_status <>
      'approved'::public.approval_status
  )
  or public.is_admin()
);


-- ============================================================
-- 15. PRODUCT EVIDENCE CLAIMS
-- ============================================================

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
    where pe.id =
      product_evidence_claims.evidence_id
      and (
        public.legacy_company_has_permission(
          p.company_user_id,
          'products.manage'
        )
        or public.is_admin()
        or public.can_verify()
        or public.can_manage_content()
      )
  )
);


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
        where p.id =
          product_evidence_claims.product_id
          and public.legacy_company_has_permission(
            p.company_user_id,
            'products.manage'
          )
      )
      or public.can_manage_content()
    )
    and verification_status <>
      'approved'::public.approval_status
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
        where p.id =
          product_evidence_claims.product_id
          and public.legacy_company_has_permission(
            p.company_user_id,
            'products.manage'
          )
      )
      or public.can_manage_content()
    )
    and verification_status <>
      'approved'::public.approval_status
  )
  or public.is_admin()
  or public.can_verify()
);


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
        where p.id =
          product_evidence_claims.product_id
          and public.legacy_company_has_permission(
            p.company_user_id,
            'products.manage'
          )
      )
      or public.can_manage_content()
    )
    and verification_status <>
      'approved'::public.approval_status
  )
  or public.is_admin()
);


commit;
