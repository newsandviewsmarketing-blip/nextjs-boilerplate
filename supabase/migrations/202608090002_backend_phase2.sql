-- VetConnect Pakistan Backend Phase 2
-- Run after 202608090001_backend_phase1.sql.
-- Adds company marketplace, product approval, saves and information requests.

alter table public.company_profiles
  add column if not exists website text,
  add column if not exists contact_email text,
  add column if not exists logo_url text;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  company_user_id uuid not null references public.company_profiles(user_id) on delete cascade,
  slug text not null unique,
  product_name text not null,
  brand_name text,
  generic_name text,
  category text not null,
  sector text,
  composition text,
  strength text,
  dosage_form text,
  pack_sizes text[] not null default '{}',
  indications text,
  description text,
  storage_instructions text,
  image_url text,
  availability text,
  verification_status public.approval_status not null default 'pending',
  rejection_reason text,
  is_published boolean not null default false,
  verified_at timestamptz,
  verified_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_compliance (
  product_id uuid primary key references public.products(id) on delete cascade,
  company_user_id uuid not null references public.company_profiles(user_id) on delete cascade,
  regulatory_number text,
  private_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_inquiries (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  company_user_id uuid not null references public.company_profiles(user_id) on delete cascade,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  inquiry_type text not null default 'information'
    check (inquiry_type in ('information', 'quotation', 'contact')),
  contact_name text not null,
  contact_email text not null,
  contact_phone text,
  organization text,
  message text not null,
  status text not null default 'new'
    check (status in ('new', 'reviewing', 'responded', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.saved_products (
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create index if not exists products_company_idx on public.products(company_user_id);
create index if not exists products_public_idx
  on public.products(verification_status, is_published, category, sector);
create index if not exists product_inquiries_company_idx
  on public.product_inquiries(company_user_id, created_at desc);
create index if not exists product_inquiries_requester_idx
  on public.product_inquiries(requester_id, created_at desc);
create index if not exists product_compliance_company_idx
  on public.product_compliance(company_user_id);

create or replace function public.protect_product_approval_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user not in ('postgres', 'service_role', 'supabase_admin')
    and not public.is_admin() and (
      new.verification_status is distinct from old.verification_status or
      new.rejection_reason is distinct from old.rejection_reason or
      new.is_published is distinct from old.is_published or
      new.verified_at is distinct from old.verified_at or
      new.verified_by is distinct from old.verified_by
    ) then
    raise exception 'Only an administrator can review or publish a product';
  end if;
  return new;
end;
$$;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at before update on public.products
  for each row execute procedure public.set_updated_at();
drop trigger if exists product_inquiries_set_updated_at on public.product_inquiries;
create trigger product_inquiries_set_updated_at before update on public.product_inquiries
  for each row execute procedure public.set_updated_at();
drop trigger if exists product_compliance_set_updated_at on public.product_compliance;
create trigger product_compliance_set_updated_at before update on public.product_compliance
  for each row execute procedure public.set_updated_at();
drop trigger if exists products_protect_approval on public.products;
create trigger products_protect_approval before update on public.products
  for each row execute procedure public.protect_product_approval_fields();

alter table public.products enable row level security;
alter table public.product_compliance enable row level security;
alter table public.product_inquiries enable row level security;
alter table public.saved_products enable row level security;

drop policy if exists "products_public_owner_or_admin_select" on public.products;
create policy "products_public_owner_or_admin_select" on public.products
for select to anon, authenticated
using (
  (verification_status = 'approved' and is_published)
  or company_user_id = (select auth.uid())
  or public.is_admin()
);

drop policy if exists "products_verified_company_insert" on public.products;
create policy "products_verified_company_insert" on public.products
for insert to authenticated
with check (
  company_user_id = (select auth.uid())
  and exists (
    select 1 from public.company_profiles company
    where company.user_id = (select auth.uid())
      and company.verification_status = 'approved'
  )
);

drop policy if exists "products_owner_or_admin_update" on public.products;
create policy "products_owner_or_admin_update" on public.products
for update to authenticated
using (company_user_id = (select auth.uid()) or public.is_admin())
with check (company_user_id = (select auth.uid()) or public.is_admin());

drop policy if exists "products_pending_owner_or_admin_delete" on public.products;
create policy "products_pending_owner_or_admin_delete" on public.products
for delete to authenticated
using (
  (company_user_id = (select auth.uid()) and verification_status <> 'approved')
  or public.is_admin()
);

drop policy if exists "inquiries_parties_or_admin_select" on public.product_inquiries;
create policy "inquiries_parties_or_admin_select" on public.product_inquiries
for select to authenticated
using (
  requester_id = (select auth.uid())
  or company_user_id = (select auth.uid())
  or public.is_admin()
);

drop policy if exists "inquiries_authenticated_insert" on public.product_inquiries;
create policy "inquiries_authenticated_insert" on public.product_inquiries
for insert to authenticated
with check (
  requester_id = (select auth.uid())
  and exists (
    select 1 from public.products product
    where product.id = product_inquiries.product_id
      and product.company_user_id = product_inquiries.company_user_id
      and product.verification_status = 'approved'
      and product.is_published
  )
);

drop policy if exists "inquiries_company_or_admin_update" on public.product_inquiries;
create policy "inquiries_company_or_admin_update" on public.product_inquiries
for update to authenticated
using (company_user_id = (select auth.uid()) or public.is_admin())
with check (company_user_id = (select auth.uid()) or public.is_admin());

drop policy if exists "product_compliance_owner_or_admin_select" on public.product_compliance;
create policy "product_compliance_owner_or_admin_select" on public.product_compliance
for select to authenticated
using (company_user_id = (select auth.uid()) or public.is_admin());

drop policy if exists "product_compliance_owner_or_admin_insert" on public.product_compliance;
create policy "product_compliance_owner_or_admin_insert" on public.product_compliance
for insert to authenticated
with check (
  company_user_id = (select auth.uid())
  and exists (
    select 1 from public.products product
    where product.id = product_compliance.product_id
      and product.company_user_id = (select auth.uid())
  )
);

drop policy if exists "product_compliance_owner_or_admin_update" on public.product_compliance;
create policy "product_compliance_owner_or_admin_update" on public.product_compliance
for update to authenticated
using (company_user_id = (select auth.uid()) or public.is_admin())
with check (company_user_id = (select auth.uid()) or public.is_admin());

drop policy if exists "product_compliance_owner_or_admin_delete" on public.product_compliance;
create policy "product_compliance_owner_or_admin_delete" on public.product_compliance
for delete to authenticated
using (company_user_id = (select auth.uid()) or public.is_admin());

drop policy if exists "saved_products_owner_manage" on public.saved_products;
create policy "saved_products_owner_manage" on public.saved_products
for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

grant select on public.products to anon;
grant select, insert, update, delete on public.products to authenticated;
grant select, insert, update, delete on public.product_compliance to authenticated;
grant select, insert, update on public.product_inquiries to authenticated;
grant select, insert, delete on public.saved_products to authenticated;
