begin;
revoke insert on public.clinic_appointment_requests from public, anon;
drop policy if exists clinic_appointment_create on public.clinic_appointment_requests;
create policy clinic_appointment_create on public.clinic_appointment_requests
for insert to authenticated with check (
  requester_id = (select auth.uid())
  and exists (
    select 1 from public.public_clinics c where c.id = clinic_id
  )
);
commit;
