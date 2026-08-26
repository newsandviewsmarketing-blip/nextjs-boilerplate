-- VetConnect Pakistan Phase 3 staff permissions
-- Run after 202608110003_phase3_master_data.sql.

begin;

create or replace function public.has_account_role(check_role text, check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = check_user_id and role::text = check_role
  );
$$;

create or replace function public.can_verify(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_account_role('super_admin', check_user_id)
    or public.has_account_role('verification_officer', check_user_id);
$$;

create or replace function public.can_manage_content(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_account_role('super_admin', check_user_id)
    or public.has_account_role('content_admin', check_user_id);
$$;

create or replace function public.can_export_contacts(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_account_role('super_admin', check_user_id)
    or public.has_account_role('career_admin', check_user_id);
$$;

create or replace function public.protect_verification_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user not in ('postgres', 'service_role', 'supabase_admin')
    and not public.can_verify() and not public.is_admin() and (
      new.verification_status is distinct from old.verification_status or
      new.rejection_reason is distinct from old.rejection_reason or
      new.verified_at is distinct from old.verified_at or
      new.verified_by is distinct from old.verified_by
    ) then
    raise exception 'Only an authorized verification administrator can review a profile';
  end if;
  if current_user not in ('postgres', 'service_role', 'supabase_admin')
    and not public.can_verify() and not public.is_admin()
    and (to_jsonb(new) - array['updated_at','verification_status','rejection_reason','verified_at','verified_by'])
      is distinct from (to_jsonb(old) - array['updated_at','verification_status','rejection_reason','verified_at','verified_by']) then
    new.verification_status := 'pending';
    new.rejection_reason := null;
    new.verified_at := null;
    new.verified_by := null;
  end if;
  return new;
end;
$$;

create or replace function public.protect_veterinarian_verification_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user not in ('postgres', 'service_role', 'supabase_admin')
    and not public.can_verify() and not public.is_admin() and (
      new.verification_status is distinct from old.verification_status or
      new.rejection_reason is distinct from old.rejection_reason or
      new.verified_at is distinct from old.verified_at or
      new.verified_by is distinct from old.verified_by or
      new.pvmc_verification_status is distinct from old.pvmc_verification_status or
      new.pvmc_verified_at is distinct from old.pvmc_verified_at or
      new.pvmc_verified_by is distinct from old.pvmc_verified_by
    ) then
    raise exception 'Only an authorized verification administrator can review a veterinarian';
  end if;
  if current_user not in ('postgres', 'service_role', 'supabase_admin')
    and not public.can_verify() and not public.is_admin()
    and (to_jsonb(new) - array['updated_at','verification_status','rejection_reason','verified_at','verified_by','pvmc_verification_status','pvmc_verified_at','pvmc_verified_by'])
      is distinct from (to_jsonb(old) - array['updated_at','verification_status','rejection_reason','verified_at','verified_by','pvmc_verification_status','pvmc_verified_at','pvmc_verified_by']) then
    new.verification_status := 'pending';
    new.rejection_reason := null;
    new.verified_at := null;
    new.verified_by := null;
  end if;
  if current_user not in ('postgres', 'service_role', 'supabase_admin')
    and not public.can_verify() and not public.is_admin()
    and new.pvmc_number is distinct from old.pvmc_number then
    new.pvmc_verification_status := 'pending';
    new.pvmc_verified_at := null;
    new.pvmc_verified_by := null;
  end if;
  return new;
end;
$$;

create or replace function public.protect_product_approval_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user not in ('postgres', 'service_role', 'supabase_admin')
    and not public.can_manage_content() and not public.can_verify() and not public.is_admin() and (
      new.verification_status is distinct from old.verification_status or
      new.rejection_reason is distinct from old.rejection_reason or
      new.is_published is distinct from old.is_published or
      new.verified_at is distinct from old.verified_at or
      new.verified_by is distinct from old.verified_by
    ) then
    raise exception 'Only an authorized administrator can review or publish this record';
  end if;
  if current_user not in ('postgres', 'service_role', 'supabase_admin')
    and not public.can_manage_content() and not public.can_verify() and not public.is_admin()
    and (
      to_jsonb(new) - array['updated_at','verification_status','rejection_reason','is_published','verified_at','verified_by']
    ) is distinct from (
      to_jsonb(old) - array['updated_at','verification_status','rejection_reason','is_published','verified_at','verified_by']
    ) then
    new.verification_status := 'pending';
    new.rejection_reason := null;
    new.is_published := false;
    new.verified_at := null;
    new.verified_by := null;
  end if;
  return new;
end;
$$;

create or replace function public.protect_laboratory_review_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user not in ('postgres', 'service_role', 'supabase_admin')
    and not public.can_verify() and not public.is_admin() and (
      new.verification_status is distinct from old.verification_status or
      new.accreditation_verification_status is distinct from old.accreditation_verification_status or
      new.rejection_reason is distinct from old.rejection_reason or
      new.is_published is distinct from old.is_published or
      new.verified_at is distinct from old.verified_at or
      new.verified_by is distinct from old.verified_by
    ) then
    raise exception 'Only an authorized verification administrator can review a laboratory';
  end if;
  if current_user not in ('postgres', 'service_role', 'supabase_admin')
    and not public.can_verify() and not public.is_admin()
    and (to_jsonb(new) - array['updated_at','verification_status','accreditation_verification_status','rejection_reason','is_published','verified_at','verified_by'])
      is distinct from (to_jsonb(old) - array['updated_at','verification_status','accreditation_verification_status','rejection_reason','is_published','verified_at','verified_by']) then
    new.verification_status := 'pending';
    new.rejection_reason := null;
    new.is_published := false;
    new.verified_at := null;
    new.verified_by := null;
  end if;
  return new;
end;
$$;

create or replace function public.protect_job_approval_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user not in ('postgres', 'service_role', 'supabase_admin')
    and not public.can_manage_content() and not public.can_verify() and not public.is_admin() and (
      new.verification_status is distinct from old.verification_status or
      new.is_published is distinct from old.is_published
    ) then
    raise exception 'Only an authorized content administrator can review or publish a job';
  end if;
  if current_user not in ('postgres', 'service_role', 'supabase_admin')
    and not public.can_manage_content() and not public.can_verify() and not public.is_admin()
    and (to_jsonb(new) - array['updated_at','verification_status','is_published'])
      is distinct from (to_jsonb(old) - array['updated_at','verification_status','is_published']) then
    new.verification_status := 'pending';
    new.is_published := false;
  end if;
  return new;
end;
$$;

create or replace function public.protect_product_regulatory_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and current_user not in ('postgres', 'service_role', 'supabase_admin')
    and not public.can_verify() and not public.is_admin() and new.verification_status <> 'pending' then
    raise exception 'Submitted regulatory information must begin in pending review';
  elsif tg_op = 'UPDATE' and current_user not in ('postgres', 'service_role', 'supabase_admin')
    and not public.can_verify() and not public.is_admin() and (
      new.verification_status is distinct from old.verification_status or
      new.reviewer_notes is distinct from old.reviewer_notes or
      new.verified_at is distinct from old.verified_at or
      new.verified_by is distinct from old.verified_by
    ) then
    raise exception 'Only an authorized verification administrator can review regulatory information';
  end if;
  if tg_op = 'UPDATE' and current_user not in ('postgres', 'service_role', 'supabase_admin')
    and not public.can_verify() and not public.is_admin() and (
      new.applicability is distinct from old.applicability or
      new.registration_status is distinct from old.registration_status or
      new.registration_number is distinct from old.registration_number or
      new.registration_holder_id is distinct from old.registration_holder_id or
      new.evidence_path is distinct from old.evidence_path
    ) then
    new.verification_status := 'pending';
    new.reviewer_notes := null;
    new.verified_at := null;
    new.verified_by := null;
  end if;
  return new;
end;
$$;

drop policy if exists "profiles_verification_select" on public.profiles;
create policy "profiles_verification_select" on public.profiles for select to authenticated using (public.can_verify());
drop policy if exists "vets_verification_manage" on public.veterinarian_profiles;
create policy "vets_verification_manage" on public.veterinarian_profiles for all to authenticated using (public.can_verify()) with check (public.can_verify());
drop policy if exists "companies_verification_manage" on public.company_profiles;
create policy "companies_verification_manage" on public.company_profiles for all to authenticated using (public.can_verify()) with check (public.can_verify());
drop policy if exists "professionals_verification_manage" on public.professional_profiles;
create policy "professionals_verification_manage" on public.professional_profiles for all to authenticated using (public.can_verify()) with check (public.can_verify());
drop policy if exists "clinics_verification_manage" on public.clinics;
create policy "clinics_verification_manage" on public.clinics for all to authenticated using (public.can_verify()) with check (public.can_verify());
drop policy if exists "laboratories_verification_manage" on public.laboratories;
create policy "laboratories_verification_manage" on public.laboratories for all to authenticated using (public.can_verify()) with check (public.can_verify());
drop policy if exists "products_content_manage" on public.products;
create policy "products_content_manage" on public.products for all to authenticated using (public.can_manage_content() or public.can_verify()) with check (public.can_manage_content() or public.can_verify());
drop policy if exists "jobs_content_manage" on public.jobs;
create policy "jobs_content_manage" on public.jobs for all to authenticated using (public.can_manage_content() or public.can_verify()) with check (public.can_manage_content() or public.can_verify());
drop policy if exists "compliance_verification_select" on public.product_compliance;
create policy "compliance_verification_select" on public.product_compliance for select to authenticated using (public.can_verify());
drop policy if exists "product_regulatory_verification_manage" on public.product_regulatory;
create policy "product_regulatory_verification_manage" on public.product_regulatory for all to authenticated using (public.can_verify()) with check (public.can_verify());
drop policy if exists "audit_staff_insert" on public.audit_logs;
create policy "audit_staff_insert" on public.audit_logs for insert to authenticated with check ((public.can_verify() or public.can_manage_content()) and actor_id = (select auth.uid()));
drop policy if exists "audit_staff_select" on public.audit_logs;
create policy "audit_staff_select" on public.audit_logs for select to authenticated using (public.can_verify() or public.can_manage_content());
drop policy if exists "export_authorized_insert" on public.export_logs;
create policy "export_authorized_insert" on public.export_logs for insert to authenticated with check (public.can_export_contacts() and exported_by = (select auth.uid()));
drop policy if exists "export_authorized_select" on public.export_logs;
create policy "export_authorized_select" on public.export_logs for select to authenticated using (exported_by = (select auth.uid()) or public.has_account_role('super_admin'));

grant execute on function public.has_account_role(text, uuid), public.can_verify(uuid), public.can_manage_content(uuid), public.can_export_contacts(uuid) to authenticated;

commit;
