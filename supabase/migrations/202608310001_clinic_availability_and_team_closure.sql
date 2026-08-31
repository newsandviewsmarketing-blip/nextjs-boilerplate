begin;

-- VetConnect Pakistan
-- Clinic availability, appointment scheduling and clinic-team hierarchy closure
-- 31 August 2026
--
-- Run after the existing 202608300003 / 202608300004 closure migrations.
-- This migration is additive and does not replace existing clinic membership logic.

-- ============================================================
-- 1. STRUCTURED WEEKLY CLINIC AVAILABILITY
-- day_of_week follows JavaScript/Postgres convention used by the app:
-- 0 Sunday ... 6 Saturday.
-- ============================================================

create table if not exists public.clinic_availability (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  is_open boolean not null default false,
  is_24_hours boolean not null default false,
  opens_at time,
  closes_at time,
  break_start time,
  break_end time,
  appointment_enabled boolean not null default false,
  slot_minutes integer not null default 30 check (slot_minutes between 5 and 240),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinic_id, day_of_week),

  constraint clinic_availability_hours_check check (
    not is_open
    or is_24_hours
    or (opens_at is not null and closes_at is not null and opens_at < closes_at)
  ),

  constraint clinic_availability_24h_check check (
    not is_24_hours or is_open
  ),

  constraint clinic_availability_break_check check (
    (break_start is null and break_end is null)
    or (
      break_start is not null
      and break_end is not null
      and break_start < break_end
    )
  )
);

create index if not exists clinic_availability_clinic_idx
  on public.clinic_availability(clinic_id, day_of_week);

alter table public.clinic_availability enable row level security;

drop policy if exists clinic_availability_public_read
on public.clinic_availability;

create policy clinic_availability_public_read
on public.clinic_availability
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.clinics c
    where c.id = clinic_id
      and c.is_published = true
  )
);

drop policy if exists clinic_availability_manager_read
on public.clinic_availability;

create policy clinic_availability_manager_read
on public.clinic_availability
for select
to authenticated
using (public.can_manage_clinic(clinic_id));

drop policy if exists clinic_availability_manage
on public.clinic_availability;

create policy clinic_availability_manage
on public.clinic_availability
for all
to authenticated
using (public.can_manage_clinic(clinic_id))
with check (public.can_manage_clinic(clinic_id));

grant select on public.clinic_availability to anon, authenticated;
grant insert, update, delete on public.clinic_availability to authenticated;

drop trigger if exists clinic_availability_set_updated_at
on public.clinic_availability;

create trigger clinic_availability_set_updated_at
before update on public.clinic_availability
for each row
execute function public.set_updated_at();


-- ============================================================
-- 2. PUBLIC CLINIC TEAM VISIBILITY
-- Only active affiliations explicitly marked public are exposed.
-- ============================================================

drop policy if exists clinic_members_select_public
on public.clinic_members;

create policy clinic_members_select_public
on public.clinic_members
for select
to anon, authenticated
using (
  membership_status = 'active'
  and is_public = true
  and exists (
    select 1
    from public.clinics c
    where c.id = clinic_id
      and c.is_published = true
  )
);

grant select on public.clinic_members to anon, authenticated;


-- ============================================================
-- 3. APPOINTMENT REQUEST EXTENSIONS
-- Existing preferred date/time remain the user's request.
-- scheduled_* are the clinic-confirmed appointment.
-- ============================================================

alter table public.clinic_appointment_requests
  add column if not exists service_id uuid
  references public.service_catalog(id)
  on delete set null;

alter table public.clinic_appointment_requests
  add column if not exists scheduled_date date;

alter table public.clinic_appointment_requests
  add column if not exists scheduled_time time;

alter table public.clinic_appointment_requests
  add column if not exists owner_note text;

create index if not exists clinic_appointment_status_idx
  on public.clinic_appointment_requests(clinic_id, status, created_at desc);


-- ============================================================
-- 4. CLINIC ENDS AN AFFILIATION
-- This closes the owner -> primary professional -> team hierarchy.
-- ============================================================

create or replace function public.end_clinic_membership(
  p_clinic_id uuid,
  p_professional_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.can_manage_clinic(p_clinic_id) then
    raise exception 'Not authorized to manage clinic professionals';
  end if;

  if not exists (
    select 1
    from public.clinic_members cm
    where cm.clinic_id = p_clinic_id
      and cm.professional_user_id = p_professional_user_id
  ) then
    raise exception 'Clinic affiliation not found';
  end if;

  update public.clinic_members
  set
    membership_status = 'ended',
    is_public = false,
    is_primary = false,
    end_date = coalesce(end_date, current_date),
    confirmed_by = auth.uid(),
    confirmed_at = now()
  where clinic_id = p_clinic_id
    and professional_user_id = p_professional_user_id;
end;
$$;

revoke all
on function public.end_clinic_membership(uuid, uuid)
from public;

grant execute
on function public.end_clinic_membership(uuid, uuid)
to authenticated;

commit;
