-- Add private practice records to the existing clinic identity and ownership model.
-- Existing profiles, facilities, appointments and public views are not copied.
begin;

create table public.clinic_customers (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  display_name text not null check (length(btrim(display_name)) between 1 and 180),
  email text,
  phone text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (clinic_id, id)
);

create table public.clinic_patients (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  customer_id uuid not null,
  display_name text not null check (length(btrim(display_name)) between 1 and 180),
  kind text not null check (kind in ('animal', 'herd', 'flock')),
  species text not null check (length(btrim(species)) between 1 and 120),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (clinic_id, id),
  foreign key (clinic_id, customer_id) references public.clinic_customers(clinic_id, id)
);
create index clinic_patients_customer_idx on public.clinic_patients(clinic_id, customer_id);

create table public.clinic_encounters (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_id uuid not null,
  clinician_id uuid references public.profiles(id) on delete set null,
  occurred_at timestamptz not null default now(),
  notes text not null default '',
  unique (clinic_id, id),
  foreign key (clinic_id, patient_id) references public.clinic_patients(clinic_id, id)
);
create index clinic_encounters_patient_idx on public.clinic_encounters(clinic_id, patient_id, occurred_at desc);

create table public.clinic_care_tasks (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_id uuid not null,
  kind text not null check (kind in ('vaccination', 'follow_up')),
  due_on date not null,
  instructions text not null check (length(btrim(instructions)) between 1 and 4000),
  completed_at timestamptz,
  foreign key (clinic_id, patient_id) references public.clinic_patients(clinic_id, id)
);
create index clinic_care_tasks_patient_idx on public.clinic_care_tasks(clinic_id, patient_id, due_on);

create table public.clinic_invoices (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  customer_id uuid not null,
  invoice_number text not null check (length(btrim(invoice_number)) between 1 and 80),
  currency text not null default 'PKR' check (currency ~ '^[A-Z]{3}$'),
  total numeric(14,2) not null check (total >= 0 and total < 'NaN'::numeric),
  issued_at timestamptz not null default now(),
  unique (clinic_id, invoice_number),
  unique (clinic_id, id),
  foreign key (clinic_id, customer_id) references public.clinic_customers(clinic_id, id)
);
create index clinic_invoices_customer_idx on public.clinic_invoices(clinic_id, customer_id);

create table public.clinic_payments (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  invoice_id uuid not null,
  reference text not null check (length(btrim(reference)) between 1 and 120),
  amount numeric(14,2) not null check (amount > 0 and amount < 'NaN'::numeric),
  received_at timestamptz not null default now(),
  unique (clinic_id, invoice_id, reference),
  foreign key (clinic_id, invoice_id) references public.clinic_invoices(clinic_id, id)
);

-- Store independent offerings for each visit mode using the existing service.
create table public.clinic_service_visit_modes (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  service_id uuid not null,
  mode text not null check (mode in ('online', 'in_clinic', 'farm_visit')),
  enabled boolean not null default false,
  fee numeric(14,2) check (fee >= 0 and fee < 'NaN'::numeric),
  show_fee boolean not null default false check (not show_fee or fee is not null),
  travel_fee numeric(14,2) check (travel_fee is null or (travel_fee >= 0 and travel_fee < 'NaN'::numeric and mode = 'farm_visit')),
  duration_minutes integer not null check (duration_minutes between 1 and 1440),
  unique (clinic_id, service_id, mode),
  unique (clinic_id, id),
  foreign key (clinic_id, service_id) references public.clinic_services(clinic_id, service_id)
);

create table public.clinic_service_visit_hours (
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  visit_mode_id uuid not null,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  opens_at time not null,
  closes_at time not null,
  break_starts_at time,
  break_ends_at time,
  primary key (clinic_id, visit_mode_id, day_of_week),
  foreign key (clinic_id, visit_mode_id) references public.clinic_service_visit_modes(clinic_id, id),
  check (opens_at < closes_at),
  check ((break_starts_at is null and break_ends_at is null) or
         (break_starts_at is not null and break_ends_at is not null and
          opens_at < break_starts_at and break_starts_at < break_ends_at and break_ends_at < closes_at))
);

-- Clinical and finance tables stay private until their delegated roles and
-- transaction workflows are implemented. Records and visit settings use owner access.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'clinic_customers', 'clinic_patients', 'clinic_encounters', 'clinic_care_tasks',
    'clinic_invoices', 'clinic_payments', 'clinic_service_visit_modes', 'clinic_service_visit_hours'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from public, anon, authenticated', table_name);
    if table_name not in (
      'clinic_customers', 'clinic_patients', 'clinic_service_visit_modes', 'clinic_service_visit_hours'
    ) then
      continue;
    end if;
    execute format('grant select, insert, update on public.%I to authenticated', table_name);
    execute format(
      'create policy clinic_owner_records on public.%1$I for all to authenticated
       using (exists (select 1 from public.clinics c where c.id = %1$I.clinic_id and c.owner_id = (select auth.uid())))
       with check (exists (select 1 from public.clinics c where c.id = %1$I.clinic_id and c.owner_id = (select auth.uid())))',
      table_name
    );
  end loop;
end
$$;

commit;
