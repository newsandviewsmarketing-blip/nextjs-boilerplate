begin;

-- Clinic date-specific closures and adjusted hours. Additive, leaves weekly hours untouched.
-- Apply before deploying application changes which read this table.
create table if not exists public.clinic_schedule_exceptions (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  exception_date date not null,
  is_closed boolean not null default true,
  opens_at time,
  closes_at time,
  reason text,
  appointment_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clinic_schedule_exceptions_unique_date unique(clinic_id,exception_date),
  constraint clinic_schedule_exceptions_hours_valid check (
    is_closed or (opens_at is not null and closes_at is not null and opens_at < closes_at)
  ),
  constraint clinic_schedule_exceptions_closed_no_booking check (
    not is_closed or appointment_enabled = false
  ),
  constraint clinic_schedule_exceptions_reason_length check (
    reason is null or char_length(reason)<=160
  )
);
create index if not exists clinic_schedule_exceptions_lookup
  on public.clinic_schedule_exceptions(clinic_id,exception_date);

alter table public.clinic_schedule_exceptions enable row level security;

drop policy if exists clinic_schedule_exceptions_public_read
on public.clinic_schedule_exceptions;
create policy clinic_schedule_exceptions_public_read
on public.clinic_schedule_exceptions for select
to anon,authenticated
using (
  exists (select 1 from public.clinics c
    where c.id=clinic_id and c.is_published=true
      and c.verification_status='approved')
);
drop policy if exists clinic_schedule_exceptions_manager_read
on public.clinic_schedule_exceptions;
create policy clinic_schedule_exceptions_manager_read
on public.clinic_schedule_exceptions for select to authenticated
using (public.can_manage_clinic(clinic_id));

drop policy if exists clinic_schedule_exceptions_manager_insert
on public.clinic_schedule_exceptions;
create policy clinic_schedule_exceptions_manager_insert
on public.clinic_schedule_exceptions for insert to authenticated
with check(public.can_manage_clinic(clinic_id));

drop policy if exists clinic_schedule_exceptions_manager_update
on public.clinic_schedule_exceptions;
create policy clinic_schedule_exceptions_manager_update
on public.clinic_schedule_exceptions for update to authenticated
using(public.can_manage_clinic(clinic_id))
with check(public.can_manage_clinic(clinic_id));

drop policy if exists clinic_schedule_exceptions_manager_delete
on public.clinic_schedule_exceptions;
create policy clinic_schedule_exceptions_manager_delete
on public.clinic_schedule_exceptions for delete to authenticated
using(public.can_manage_clinic(clinic_id));

grant select on public.clinic_schedule_exceptions to anon,authenticated;
grant insert,update,delete on public.clinic_schedule_exceptions to authenticated;
drop trigger if exists clinic_schedule_exceptions_set_updated_at
on public.clinic_schedule_exceptions;
create trigger clinic_schedule_exceptions_set_updated_at
before update on public.clinic_schedule_exceptions
for each row execute function public.set_updated_at();

commit;
