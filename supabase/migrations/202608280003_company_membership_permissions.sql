begin;

-- ============================================================
-- VetConnect
-- Company Membership Permissions
--
-- Goals:
-- 1. Keep canonical company identity separate from user identity.
-- 2. Allow professionals to request affiliation with a company.
-- 3. Allow authorized company members to approve claims.
-- 4. Allow companies to invite existing VetConnect users.
-- 5. Keep privileged company permissions controlled.
-- 6. Do not change legacy company_profiles, products or jobs.
-- ============================================================


-- ============================================================
-- 1. COMPANY PERMISSION HELPER
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
  select exists (
    select 1
    from public.company_members cm
    where cm.company_id = p_company_id
      and cm.user_id = auth.uid()
      and cm.membership_status = 'active'
      and cm.verification_status = 'approved'::public.approval_status
      and (
        cm.member_role = 'owner'
        or 'company.manage' = any(coalesce(cm.permissions, '{}'::text[]))
        or p_permission = any(coalesce(cm.permissions, '{}'::text[]))
      )
  );
$$;

revoke all on function public.company_has_permission(uuid, text)
from public;

grant execute on function public.company_has_permission(uuid, text)
to authenticated;


-- ============================================================
-- 2. SAFE COMPANY DIRECTORY SEARCH
--
-- Exposes only safe company fields.
-- Does not expose owner IDs, created_by or verification officers.
-- ============================================================

create or replace function public.search_company_directory(
  p_query text default null,
  p_limit integer default 20
)
returns table (
  company_id uuid,
  canonical_name text,
  legal_name text,
  trade_name text,
  slug text,
  country text,
  verification_status text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.canonical_name,
    c.legal_name,
    c.trade_name,
    c.slug,
    c.country,
    c.verification_status::text
  from public.companies c
  where c.record_status = 'active'
    and c.verification_status = 'approved'::public.approval_status
    and (
      p_query is null
      or btrim(p_query) = ''
      or c.canonical_name ilike '%' || btrim(p_query) || '%'
      or coalesce(c.legal_name, '') ilike '%' || btrim(p_query) || '%'
      or coalesce(c.trade_name, '') ilike '%' || btrim(p_query) || '%'
    )
  order by c.canonical_name
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

revoke all on function public.search_company_directory(text, integer)
from public;

grant execute on function public.search_company_directory(text, integer)
to authenticated;


-- ============================================================
-- 3. SELF-CLAIM / AFFILIATION REQUEST
--
-- A user can request only:
-- employee
-- consultant
--
-- They cannot self-assign privileged permissions.
-- ============================================================

create or replace function public.request_company_membership(
  p_company_id uuid,
  p_relationship_type text default 'employee',
  p_designation text default null,
  p_department text default null,
  p_is_public boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing public.company_members%rowtype;
  v_membership_id uuid;
begin

  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_relationship_type not in ('employee', 'consultant') then
    raise exception 'Invalid relationship type';
  end if;

  if not exists (
    select 1
    from public.companies c
    where c.id = p_company_id
      and c.record_status = 'active'
      and c.verification_status = 'approved'::public.approval_status
  ) then
    raise exception 'Company is not available for affiliation requests';
  end if;

  select *
  into v_existing
  from public.company_members
  where company_id = p_company_id
    and user_id = v_user_id
  for update;

  if found then

    if v_existing.member_role = 'owner' then
      raise exception 'Company owner membership cannot be replaced';
    end if;

    if v_existing.membership_status = 'active' then
      raise exception 'You already have an active membership with this company';
    end if;

    if v_existing.membership_status = 'pending' then
      raise exception 'A membership request is already pending';
    end if;

if v_existing.membership_status = 'suspended' then
  raise exception 'This membership is suspended and cannot be re-requested';
end if;
    update public.company_members
    set
      member_role = p_relationship_type,
      designation = nullif(btrim(p_designation), ''),
      department = nullif(btrim(p_department), ''),
      permissions = '{}'::text[],
      relationship_type = p_relationship_type,
      membership_status = 'pending',
      verification_status = 'pending'::public.approval_status,
      claim_source = 'self_claim',
      start_date = null,
      end_date = null,
      is_current = true,
      is_public = coalesce(p_is_public, true),
      is_primary = false,
      invited_by = null,
      confirmed_by = null,
      confirmed_at = null
    where id = v_existing.id
    returning id into v_membership_id;

    return v_membership_id;
  end if;

  insert into public.company_members (
    company_id,
    user_id,
    member_role,
    designation,
    department,
    permissions,
    relationship_type,
    membership_status,
    verification_status,
    claim_source,
    is_current,
    is_public,
    is_primary
  )
  values (
    p_company_id,
    v_user_id,
    p_relationship_type,
    nullif(btrim(p_designation), ''),
    nullif(btrim(p_department), ''),
    '{}'::text[],
    p_relationship_type,
    'pending',
    'pending'::public.approval_status,
    'self_claim',
    true,
    coalesce(p_is_public, true),
    false
  )
  returning id into v_membership_id;

  return v_membership_id;
end;
$$;

revoke all on function public.request_company_membership(
  uuid,
  text,
  text,
  text,
  boolean
) from public;

grant execute on function public.request_company_membership(
  uuid,
  text,
  text,
  text,
  boolean
) to authenticated;


-- ============================================================
-- 4. REVIEW SELF-CLAIM
--
-- members.manage or company.manage can review.
-- Approval does NOT grant management permissions.
-- ============================================================

create or replace function public.review_company_membership_claim(
  p_membership_id uuid,
  p_approve boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_claim_source text;
  v_membership_status text;
begin

  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select
    cm.company_id,
    cm.claim_source,
    cm.membership_status
  into
    v_company_id,
    v_claim_source,
    v_membership_status
  from public.company_members cm
  where cm.id = p_membership_id
  for update;

  if not found then
    raise exception 'Membership request not found';
  end if;

  if not (
    public.is_admin()
    or public.company_has_permission(v_company_id, 'members.manage')
    or public.company_has_permission(v_company_id, 'company.manage')
  ) then
    raise exception 'Not authorized to review company memberships';
  end if;

  if v_claim_source <> 'self_claim' then
    raise exception 'This membership is not a self-claim request';
  end if;

  if v_membership_status <> 'pending' then
    raise exception 'Membership request is no longer pending';
  end if;

  if p_approve then

    update public.company_members
    set
      membership_status = 'active',
      verification_status = 'approved'::public.approval_status,
      start_date = coalesce(start_date, current_date),
      end_date = null,
      is_current = true,
      confirmed_by = auth.uid(),
      confirmed_at = now()
    where id = p_membership_id;

  else

    update public.company_members
    set
      membership_status = 'rejected',
      verification_status = 'rejected'::public.approval_status,
      is_current = false,
      confirmed_by = auth.uid(),
      confirmed_at = now()
    where id = p_membership_id;

  end if;
end;
$$;

revoke all on function public.review_company_membership_claim(uuid, boolean)
from public;

grant execute on function public.review_company_membership_claim(uuid, boolean)
to authenticated;


-- ============================================================
-- 5. COMPANY INVITATION
--
-- members.manage:
--   may invite employee / consultant only.
--
-- company.manage:
--   may assign non-owner workspace roles and safe permissions.
--
-- Nobody can create another owner through this function.
-- ============================================================

create or replace function public.invite_company_member(
  p_company_id uuid,
  p_user_id uuid,
  p_member_role text default 'employee',
  p_designation text default null,
  p_department text default null,
  p_permissions text[] default '{}'::text[],
  p_is_public boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inviter uuid := auth.uid();
  v_can_manage_company boolean;
  v_can_manage_members boolean;
  v_permissions text[] := coalesce(p_permissions, '{}'::text[]);
  v_existing public.company_members%rowtype;
  v_membership_id uuid;
begin

  if v_inviter is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = p_user_id
  ) then
    raise exception 'VetConnect user not found';
  end if;

  if not exists (
    select 1
    from public.companies c
    where c.id = p_company_id
      and c.record_status = 'active'
  ) then
    raise exception 'Company not found or inactive';
  end if;

  if p_member_role not in (
    'employee',
    'consultant',
    'hr_manager',
    'recruiter',
    'product_manager',
    'sales_manager',
    'technical_manager',
    'company_admin'
  ) then
    raise exception 'Invalid company member role';
  end if;

  if not (
    v_permissions <@ array[
      'company.manage',
      'members.manage',
      'members.view',
      'jobs.manage',
      'applicants.manage',
      'products.manage',
      'company.view_private'
    ]::text[]
  ) then
    raise exception 'Unknown company permission requested';
  end if;

  v_can_manage_company :=
    public.is_admin()
    or public.company_has_permission(p_company_id, 'company.manage');

  v_can_manage_members :=
    v_can_manage_company
    or public.company_has_permission(p_company_id, 'members.manage');

  if not v_can_manage_members then
    raise exception 'Not authorized to invite company members';
  end if;

  -- HR/member managers may invite normal staff only.
  if not v_can_manage_company then

    if p_member_role not in ('employee', 'consultant') then
      raise exception 'Only company managers may assign privileged roles';
    end if;

    if coalesce(array_length(v_permissions, 1), 0) > 0 then
      raise exception 'Only company managers may assign permissions';
    end if;

  end if;

  if p_user_id = v_inviter then
    raise exception 'Use your existing membership instead of inviting yourself';
  end if;

  select *
  into v_existing
  from public.company_members
  where company_id = p_company_id
    and user_id = p_user_id
  for update;

  if found then

    if v_existing.member_role = 'owner' then
      raise exception 'Company owner membership cannot be replaced';
    end if;

    if v_existing.membership_status = 'active' then
      raise exception 'User is already an active company member';
    end if;

   if v_existing.membership_status = 'pending' then
  raise exception 'A membership request or invitation is already pending';
end if;

if v_existing.membership_status = 'suspended' then
  raise exception 'Suspended membership requires separate administrative review';
end if;

update public.company_members
set
      member_role = p_member_role,
      designation = nullif(btrim(p_designation), ''),
      department = nullif(btrim(p_department), ''),
      permissions = v_permissions,
      relationship_type = case
        when p_member_role = 'consultant' then 'consultant'
        else 'employee'
      end,
      membership_status = 'pending',
      verification_status = 'pending'::public.approval_status,
      claim_source = 'company_invitation',
      start_date = null,
      end_date = null,
      is_current = true,
      is_public = coalesce(p_is_public, true),
      is_primary = false,
      invited_by = v_inviter,
      confirmed_by = null,
      confirmed_at = null
    where id = v_existing.id
    returning id into v_membership_id;

    return v_membership_id;
  end if;

  insert into public.company_members (
    company_id,
    user_id,
    member_role,
    designation,
    department,
    permissions,
    relationship_type,
    membership_status,
    verification_status,
    claim_source,
    is_current,
    is_public,
    is_primary,
    invited_by
  )
  values (
    p_company_id,
    p_user_id,
    p_member_role,
    nullif(btrim(p_designation), ''),
    nullif(btrim(p_department), ''),
    v_permissions,
    case
      when p_member_role = 'consultant' then 'consultant'
      else 'employee'
    end,
    'pending',
    'pending'::public.approval_status,
    'company_invitation',
    true,
    coalesce(p_is_public, true),
    false,
    v_inviter
  )
  returning id into v_membership_id;

  return v_membership_id;
end;
$$;

revoke all on function public.invite_company_member(
  uuid,
  uuid,
  text,
  text,
  text,
  text[],
  boolean
) from public;

grant execute on function public.invite_company_member(
  uuid,
  uuid,
  text,
  text,
  text,
  text[],
  boolean
) to authenticated;


-- ============================================================
-- 6. ACCEPT / REJECT COMPANY INVITATION
-- ============================================================

create or replace function public.respond_company_invitation(
  p_membership_id uuid,
  p_accept boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_membership public.company_members%rowtype;
begin

  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select *
  into v_membership
  from public.company_members
  where id = p_membership_id
    and user_id = auth.uid()
  for update;

  if not found then
    raise exception 'Invitation not found';
  end if;

  if v_membership.claim_source <> 'company_invitation' then
    raise exception 'This record is not a company invitation';
  end if;

  if v_membership.membership_status <> 'pending' then
    raise exception 'Invitation is no longer pending';
  end if;

  if p_accept then

    update public.company_members
    set
      membership_status = 'active',
      verification_status = 'approved'::public.approval_status,
      start_date = coalesce(start_date, current_date),
      end_date = null,
      is_current = true,
      confirmed_by = auth.uid(),
      confirmed_at = now()
    where id = p_membership_id;

  else

    update public.company_members
    set
      membership_status = 'rejected',
      verification_status = 'rejected'::public.approval_status,
      is_current = false,
      confirmed_by = auth.uid(),
      confirmed_at = now()
    where id = p_membership_id;

  end if;
end;
$$;

revoke all on function public.respond_company_invitation(uuid, boolean)
from public;

grant execute on function public.respond_company_invitation(uuid, boolean)
to authenticated;


-- ============================================================
-- 7. CHANGE MEMBER WORKSPACE ACCESS
--
-- Only company.manage / admin.
-- Owner role cannot be assigned or modified here.
-- ============================================================

create or replace function public.set_company_member_access(
  p_membership_id uuid,
  p_member_role text,
  p_permissions text[] default '{}'::text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_current_role text;
  v_status text;
  v_permissions text[] := coalesce(p_permissions, '{}'::text[]);
begin

  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_member_role not in (
    'employee',
    'consultant',
    'hr_manager',
    'recruiter',
    'product_manager',
    'sales_manager',
    'technical_manager',
    'company_admin'
  ) then
    raise exception 'Invalid company member role';
  end if;

  if not (
    v_permissions <@ array[
      'company.manage',
      'members.manage',
      'members.view',
      'jobs.manage',
      'applicants.manage',
      'products.manage',
      'company.view_private'
    ]::text[]
  ) then
    raise exception 'Unknown company permission requested';
  end if;

  select
    cm.company_id,
    cm.member_role,
    cm.membership_status
  into
    v_company_id,
    v_current_role,
    v_status
  from public.company_members cm
  where cm.id = p_membership_id
  for update;

  if not found then
    raise exception 'Company membership not found';
  end if;

  if v_current_role = 'owner' then
    raise exception 'Owner access cannot be modified through this function';
  end if;

  if v_status <> 'active' then
    raise exception 'Only active memberships can receive workspace access';
  end if;

  if not (
    public.is_admin()
    or public.company_has_permission(v_company_id, 'company.manage')
  ) then
    raise exception 'Not authorized to change company workspace access';
  end if;

  update public.company_members
  set
    member_role = p_member_role,
    permissions = v_permissions
  where id = p_membership_id;

end;
$$;

revoke all on function public.set_company_member_access(
  uuid,
  text,
  text[]
) from public;

grant execute on function public.set_company_member_access(
  uuid,
  text,
  text[]
) to authenticated;


-- ============================================================
-- 8. RLS: MEMBERS MAY SEE THEIR OWN MEMBERSHIP
-- ============================================================

drop policy if exists company_members_select_self
on public.company_members;

create policy company_members_select_self
on public.company_members
for select
to authenticated
using (
  user_id = auth.uid()
);


-- ============================================================
-- 9. RLS: AUTHORIZED COMPANY MANAGERS MAY VIEW MEMBERS
--
-- No direct INSERT/UPDATE/DELETE permissions are added here.
-- Writes go through the controlled functions above.
-- Existing admin foundation policy remains intact.
-- ============================================================

drop policy if exists company_members_select_managers
on public.company_members;

create policy company_members_select_managers
on public.company_members
for select
to authenticated
using (
  public.company_has_permission(company_id, 'members.view')
  or public.company_has_permission(company_id, 'members.manage')
  or public.company_has_permission(company_id, 'company.manage')
);


commit;
