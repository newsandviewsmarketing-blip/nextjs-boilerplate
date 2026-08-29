begin;

-- ============================================================
-- VetConnect
-- 009 V1 FINAL SECURITY HARDENING
--
-- Purpose:
-- 1. Establish one canonical active-account security helper.
-- 2. Prevent suspended accounts from retaining role/admin/
--    company/clinic permissions.
-- 3. Add restrictive RLS enforcement so direct authenticated
--    database access cannot bypass application suspension checks.
--
-- This migration does NOT delete application data.
-- ============================================================


-- ============================================================
-- 1. CANONICAL ACTIVE ACCOUNT HELPER
-- ============================================================

create or replace function public.is_account_active(
  check_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    check_user_id is not null
    and exists (
      select 1
      from public.profiles p
      where p.id = check_user_id
        and p.account_status = 'active'
    );
$$;

revoke all
on function public.is_account_active(uuid)
from public;

grant execute
on function public.is_account_active(uuid)
to authenticated;

grant execute
on function public.is_account_active(uuid)
to service_role;


-- ============================================================
-- 2. ACCOUNT ROLE CHECK
-- ============================================================

create or replace function public.has_account_role(
  check_role text,
  check_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_account_active(check_user_id)
    and exists (
      select 1
      from public.user_roles ur
      where ur.user_id = check_user_id
        and ur.role::text = check_role
    );
$$;


-- ============================================================
-- 3. SUPER ADMIN CHECK
-- ============================================================

create or replace function public.is_super_admin(
  check_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_account_active(check_user_id)
    and exists (
      select 1
      from public.user_roles ur
      where ur.user_id = check_user_id
        and ur.role = 'super_admin'
    );
$$;


-- ============================================================
-- 4. ADMIN CHECK
--
-- Existing VetConnect semantics preserved:
-- is_admin() = Super Administrator.
-- ============================================================

create or replace function public.is_admin(
  check_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_account_active(check_user_id)
    and public.is_super_admin(check_user_id);
$$;


-- ============================================================
-- 5. ADMIN PERMISSION CHECK
-- ============================================================

create or replace function public.has_admin_permission(
  check_permission text,
  check_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_account_active(check_user_id)
    and exists (
      select 1
      from public.user_roles ur
      join public.admin_role_permissions arp
        on arp.role = ur.role
      where ur.user_id = check_user_id
        and check_permission = any(arp.permissions)
    );
$$;


-- ============================================================
-- 6. VERIFICATION PERMISSION
-- ============================================================

create or replace function public.can_verify(
  check_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_account_active(check_user_id)
    and (
      public.has_account_role(
        'super_admin',
        check_user_id
      )
      or public.has_account_role(
        'verification_officer',
        check_user_id
      )
    );
$$;


-- ============================================================
-- 7. CONTENT MANAGEMENT PERMISSION
-- ============================================================

create or replace function public.can_manage_content(
  check_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_account_active(check_user_id)
    and (
      public.has_account_role(
        'super_admin',
        check_user_id
      )
      or public.has_account_role(
        'content_admin',
        check_user_id
      )
    );
$$;


-- ============================================================
-- 8. CONTACT EXPORT PERMISSION
-- ============================================================

create or replace function public.can_export_contacts(
  check_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_account_active(check_user_id)
    and (
      public.has_account_role(
        'super_admin',
        check_user_id
      )
      or public.has_account_role(
        'career_admin',
        check_user_id
      )
    );
$$;


-- ============================================================
-- 9. JOB MANAGEMENT PERMISSION
-- ============================================================

create or replace function public.can_manage_jobs(
  check_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_account_active(check_user_id)
    and public.has_admin_permission(
      'jobs.manage',
      check_user_id
    );
$$;


-- ============================================================
-- 10. COMPANY MEMBER PERMISSIONS
-- ============================================================

create or replace function public.company_has_permission(
  p_company_id uuid,
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
      from public.company_members cm
      where cm.company_id = p_company_id
        and cm.user_id = auth.uid()
        and cm.membership_status = 'active'
        and cm.verification_status =
          'approved'::public.approval_status
        and (
          cm.member_role = 'owner'
          or 'company.manage' =
            any(
              coalesce(
                cm.permissions,
                '{}'::text[]
              )
            )
          or p_permission =
            any(
              coalesce(
                cm.permissions,
                '{}'::text[]
              )
            )
        )
    );
$$;


-- ============================================================
-- 11. JOB APPLICANT MANAGEMENT
-- ============================================================

create or replace function public.can_manage_job_applicants(
  p_job_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_account_active(auth.uid())
    and (
      public.is_admin()
      or public.can_manage_jobs()
      or exists (
        select 1
        from public.jobs j
        where j.id = p_job_id
          and public.company_has_permission(
            j.company_id,
            'applicants.manage'
          )
      )
    );
$$;


-- ============================================================
-- 12. CLINIC MANAGEMENT
-- ============================================================

create or replace function public.can_manage_clinic(
  p_clinic_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_account_active(auth.uid())
    and (
      public.is_admin()
      or exists (
        select 1
        from public.clinics c
        where c.id = p_clinic_id
          and c.owner_id = auth.uid()
      )
    );
$$;


-- ============================================================
-- 13. GLOBAL AUTHENTICATED ACCOUNT RLS GUARD
--
-- PostgreSQL permissive policies are OR'ed together.
--
-- A RESTRICTIVE policy is therefore used as an additional
-- mandatory condition.
--
-- Every authenticated operation on an RLS-enabled public table
-- must come from an active VetConnect account.
--
-- profiles is treated separately below because the application
-- must still be able to READ the user's own account_status long
-- enough to identify a suspended session and terminate it.
-- ============================================================

do $$
declare
  target_table record;
begin

  for target_table in

    select c.relname as table_name

    from pg_class c

    join pg_namespace n
      on n.oid = c.relnamespace

    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relrowsecurity = true
      and c.relname <> 'profiles'

    order by c.relname

  loop

    execute format(
      'drop policy if exists active_account_guard on public.%I',
      target_table.table_name
    );

    execute format(
      'create policy active_account_guard
       on public.%I
       as restrictive
       for all
       to authenticated
       using (public.is_account_active())
       with check (public.is_account_active())',
      target_table.table_name
    );

  end loop;

end
$$;


-- ============================================================
-- 14. PROFILES SPECIAL CASE
--
-- Suspended users may still READ the row needed for application
-- session-status detection.
--
-- They may NOT INSERT, UPDATE or DELETE profile data.
-- account_status remains protected separately by the existing
-- protect_profile_permissions trigger.
-- ============================================================

drop policy if exists
  active_account_profile_insert_guard
on public.profiles;

create policy active_account_profile_insert_guard
on public.profiles
as restrictive
for insert
to authenticated
with check (
  public.is_account_active()
);


drop policy if exists
  active_account_profile_update_guard
on public.profiles;

create policy active_account_profile_update_guard
on public.profiles
as restrictive
for update
to authenticated
using (
  public.is_account_active()
)
with check (
  public.is_account_active()
);


drop policy if exists
  active_account_profile_delete_guard
on public.profiles;

create policy active_account_profile_delete_guard
on public.profiles
as restrictive
for delete
to authenticated
using (
  public.is_account_active()
);


commit;
