begin;

-- ============================================================
-- VetConnect
-- 008 CLINIC SERVICES FOUNDATION
--
-- Creates a canonical service catalogue and normalized
-- clinic-specific service offerings.
--
-- Existing clinics.services text[] is intentionally preserved
-- for frontend/backward compatibility.
--
-- Existing clinics.working_hours is not modified here.
-- Structured operating hours will be handled separately.
-- ============================================================


-- ============================================================
-- 1. CANONICAL SERVICE CATALOG
-- ============================================================

create table if not exists public.service_catalog (

  id uuid primary key
    default gen_random_uuid(),

  slug text not null unique,

  service_name text not null,

  category text not null,

  description text,

  is_active boolean not null
    default true,

  sort_order integer not null
    default 0,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  constraint service_catalog_slug_not_blank
    check (btrim(slug) <> ''),

  constraint service_catalog_name_not_blank
    check (btrim(service_name) <> ''),

  constraint service_catalog_category_check
    check (
      category in (
        'consultation',
        'preventive_care',
        'vaccination',
        'diagnostics',
        'laboratory',
        'procedure',
        'surgery',
        'emergency',
        'farm_service',
        'telemedicine',
        'grooming',
        'other'
      )
    ),

  constraint service_catalog_sort_order_check
    check (sort_order >= 0)
);


-- ============================================================
-- 2. CLINIC SERVICE OFFERINGS
-- ============================================================

create table if not exists public.clinic_services (

  id uuid primary key
    default gen_random_uuid(),

  clinic_id uuid not null
    references public.clinics(id)
    on delete cascade,

  service_id uuid not null
    references public.service_catalog(id)
    on delete restrict,

  custom_service_name text,

  description text,

  fee_min numeric(12,2),

  fee_max numeric(12,2),

  currency text not null
    default 'PKR',

  duration_minutes integer,

  is_public boolean not null
    default true,

  is_active boolean not null
    default true,

  booking_enabled boolean not null
    default false,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  constraint clinic_services_clinic_service_unique
    unique (clinic_id, service_id),

  constraint clinic_services_fee_min_check
    check (
      fee_min is null
      or fee_min >= 0
    ),

  constraint clinic_services_fee_max_check
    check (
      fee_max is null
      or fee_max >= 0
    ),

  constraint clinic_services_fee_range_check
    check (
      fee_min is null
      or fee_max is null
      or fee_max >= fee_min
    ),

  constraint clinic_services_currency_check
    check (
      currency ~ '^[A-Z]{3}$'
    ),

  constraint clinic_services_duration_check
    check (
      duration_minutes is null
      or duration_minutes > 0
    ),

  constraint clinic_services_custom_name_check
    check (
      custom_service_name is null
      or btrim(custom_service_name) <> ''
    )
);


-- ============================================================
-- 3. INDEXES
-- ============================================================

create index if not exists
  service_catalog_active_category_idx
on public.service_catalog(
  is_active,
  category,
  sort_order
);


create index if not exists
  clinic_services_clinic_idx
on public.clinic_services(clinic_id);


create index if not exists
  clinic_services_service_idx
on public.clinic_services(service_id);


create index if not exists
  clinic_services_public_idx
on public.clinic_services(
  clinic_id,
  is_active,
  is_public
);


create index if not exists
  clinic_services_booking_idx
on public.clinic_services(
  clinic_id,
  booking_enabled
)
where is_active = true;


-- ============================================================
-- 4. UPDATED_AT TRIGGERS
-- ============================================================

drop trigger if exists
  service_catalog_set_updated_at
on public.service_catalog;

create trigger service_catalog_set_updated_at
before update
on public.service_catalog
for each row
execute function public.set_updated_at();


drop trigger if exists
  clinic_services_set_updated_at
on public.clinic_services;

create trigger clinic_services_set_updated_at
before update
on public.clinic_services
for each row
execute function public.set_updated_at();


-- ============================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================

alter table public.service_catalog
enable row level security;

alter table public.clinic_services
enable row level security;


-- ============================================================
-- 6. SERVICE CATALOG POLICIES
--
-- Catalogue is readable by authenticated users.
-- Only admins manage canonical taxonomy.
-- ============================================================

drop policy if exists
  service_catalog_authenticated_read
on public.service_catalog;

create policy service_catalog_authenticated_read
on public.service_catalog
for select
to authenticated
using (
  is_active = true
  or public.is_admin()
);


drop policy if exists
  service_catalog_admin_manage
on public.service_catalog;

create policy service_catalog_admin_manage
on public.service_catalog
for all
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);


-- ============================================================
-- 7. CLINIC SERVICE READ POLICY
--
-- Clinic managers/admins can see all service rows.
-- Other authenticated users only see active public services
-- belonging to an approved + published clinic.
-- ============================================================

drop policy if exists
  clinic_services_authenticated_read
on public.clinic_services;

create policy clinic_services_authenticated_read
on public.clinic_services
for select
to authenticated
using (
  public.can_manage_clinic(clinic_id)
  or public.is_admin()
  or (
    is_active = true
    and is_public = true
    and exists (
      select 1
      from public.clinics c
      where c.id = clinic_services.clinic_id
        and c.verification_status =
          'approved'::public.approval_status
        and c.is_published = true
    )
  )
);


-- ============================================================
-- 8. CLINIC MANAGER SERVICE WRITE POLICIES
-- ============================================================

drop policy if exists
  clinic_services_manager_insert
on public.clinic_services;

create policy clinic_services_manager_insert
on public.clinic_services
for insert
to authenticated
with check (
  public.can_manage_clinic(clinic_id)
);


drop policy if exists
  clinic_services_manager_update
on public.clinic_services;

create policy clinic_services_manager_update
on public.clinic_services
for update
to authenticated
using (
  public.can_manage_clinic(clinic_id)
)
with check (
  public.can_manage_clinic(clinic_id)
);


drop policy if exists
  clinic_services_manager_delete
on public.clinic_services;

create policy clinic_services_manager_delete
on public.clinic_services
for delete
to authenticated
using (
  public.can_manage_clinic(clinic_id)
);


-- ============================================================
-- 9. INITIAL CANONICAL VETERINARY SERVICE TAXONOMY
--
-- Minimal seed set only.
-- These can later be expanded through admin management.
-- ============================================================

insert into public.service_catalog (
  slug,
  service_name,
  category,
  sort_order
)
values

  (
    'general-consultation',
    'General Consultation',
    'consultation',
    10
  ),

  (
    'vaccination',
    'Vaccination',
    'vaccination',
    20
  ),

  (
    'preventive-health-care',
    'Preventive Health Care',
    'preventive_care',
    30
  ),

  (
    'diagnostic-services',
    'Diagnostic Services',
    'diagnostics',
    40
  ),

  (
    'laboratory-services',
    'Laboratory Services',
    'laboratory',
    50
  ),

  (
    'surgery',
    'Surgery',
    'surgery',
    60
  ),

  (
    'emergency-care',
    'Emergency Care',
    'emergency',
    70
  ),

  (
    'farm-visit',
    'Farm Visit',
    'farm_service',
    80
  ),

  (
    'tele-veterinary-consultation',
    'Tele-Veterinary Consultation',
    'telemedicine',
    90
  ),

  (
    'grooming-pet-care',
    'Grooming & Pet Care',
    'grooming',
    100
  ),

  (
    'other-veterinary-service',
    'Other Veterinary Service',
    'other',
    110
  )

on conflict (slug)
do nothing;


commit;
