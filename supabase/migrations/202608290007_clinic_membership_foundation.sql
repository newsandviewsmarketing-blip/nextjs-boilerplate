begin;

-- ============================================================
-- VetConnect
-- CLINIC MEMBERSHIP / CLAIM / INVITATION FOUNDATION
--
-- Clinic is a facility identity.
-- Professional membership is an affiliation with that facility.
--
-- This migration does NOT equate clinic membership with
-- professional/PVMC verification.
-- ============================================================


-- ============================================================
-- 1. EXTEND EXISTING CLINIC MEMBERSHIP RECORD
-- ============================================================

alter table public.clinic_members
  add column if not exists membership_status text
    not null default 'pending';

alter table public.clinic_members
  add column if not exists claim_source text
    not null default 'self_claim';

alter table public.clinic_members
  add column if not exists invited_by uuid;

alter table public.clinic_members
  add column if not exists confirmed_by uuid;

alter table public.clinic_members
  add column if not exists confirmed_at timestamptz;

alter table public.clinic_members
  add column if not exists start_date date;

alter table public.clinic_members
  add column if not exists end_date date;

alter table public.clinic_members
  add column if not exists updated_at timestamptz
    not null default now();


-- ============================================================
-- 2. MEMBERSHIP STATUS / CLAIM SOURCE CONSTRAINTS
-- ============================================================

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.clinic_members'::regclass
      and conname = 'clinic_members_membership_status_check'
  ) then
    alter table public.clinic_members
      add constraint clinic_members_membership_status_check
      check (
        membership_status in (
          'pending',
          'active',
          'inactive',
          'ended',
          'rejected',
          'suspended'
        )
      );
  end if;
end
$$;


do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.clinic_members'::regclass
      and conname = 'clinic_members_claim_source_check'
  ) then
    alter table public.clinic_members
      add constraint clinic_members_claim_source_check
      check (
        claim_source in (
          'self_claim',
          'clinic_invitation',
          'owner_added',
          'admin_added'
        )
      );
  end if;
end
$$;


do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.clinic_members'::regclass
      and conname = 'clinic_members_primary_active_check'
  ) then
    alter table public.clinic_members
      add constraint clinic_members_primary_active_check
      check (
        not is_primary
        or membership_status = 'active'
      );
  end if;
end
$$;


-- ============================================================
-- 3. PROFESSIONAL IDENTITY HARDENING
--
-- Existing profiles(id) FK remains for compatibility.
-- This additional FK ensures clinic members also have a
-- canonical professional profile.
-- ============================================================

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.clinic_members'::regclass
      and conname =
        'clinic_members_professional_profile_fkey'
  ) then
    alter table public.clinic_members
      add constraint clinic_members_professional_profile_fkey
      foreign key (professional_user_id)
      references public.professional_profiles(user_id)
      on delete cascade;
  end if;
end
$$;


-- ============================================================
-- 4. AUDIT FKs
-- ============================================================

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.clinic_members'::regclass
      and conname = 'clinic_members_invited_by_fkey'
  ) then
    alter table public.clinic_members
      add constraint clinic_members_invited_by_fkey
      foreign key (invited_by)
      references public.profiles(id)
      on delete set null;
  end if;
end
$$;


do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.clinic_members'::regclass
      and conname = 'clinic_members_confirmed_by_fkey'
  ) then
    alter table public.clinic_members
      add constraint clinic_members_confirmed_by_fkey
      foreign key (confirmed_by)
      references public.profiles(id)
      on delete set null;
  end if;
end
$$;


-- ============================================================
-- 5. INDEXES
-- ============================================================

create index if not exists
  clinic_members_professional_user_id_idx
on public.clinic_members(professional_user_id);


create index if not exists
  clinic_members_status_idx
on public.clinic_members(membership_status);


create index if not exists
  clinic_members_claim_source_idx
on public.clinic_members(claim_source);


create unique index if not exists
  clinic_members_one_primary_per_clinic_idx
on public.clinic_members(clinic_id)
where is_primary = true
  and membership_status = 'active';


-- ============================================================
-- 6. UPDATED_AT
-- ============================================================

drop trigger if exists clinic_members_set_updated_at
on public.clinic_members;


create trigger clinic_members_set_updated_at
before update
on public.clinic_members
for each row
execute function public.set_updated_at();


-- ============================================================
-- 7. CLINIC MANAGEMENT HELPER
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
    public.is_admin()
    or exists (
      select 1
      from public.clinics c
      where c.id = p_clinic_id
        and c.owner_id = auth.uid()
    );
$$;


revoke all
on function public.can_manage_clinic(uuid)
from public;


grant execute
on function public.can_manage_clinic(uuid)
to authenticated;


-- ============================================================
-- 8. PROFESSIONAL SELF-CLAIM
-- ============================================================

create or replace function public.request_clinic_membership(
  p_clinic_id uuid,
  p_designation text default null,
  p_is_public boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin

  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;


  if not exists (
    select 1
    from public.professional_profiles pp
    where pp.user_id = auth.uid()
  ) then
    raise exception
      'A professional profile is required to claim a clinic affiliation';
  end if;


  if not exists (
    select 1
    from public.clinics c
    where c.id = p_clinic_id
  ) then
    raise exception 'Clinic not found';
  end if;


  select cm.membership_status
  into v_status
  from public.clinic_members cm
  where cm.clinic_id = p_clinic_id
    and cm.professional_user_id = auth.uid()
  for update;


  if found then

    if v_status = 'active' then
      raise exception
        'You already have an active affiliation with this clinic';
    end if;

    if v_status = 'pending' then
      raise exception
        'A clinic affiliation request is already pending';
    end if;

    if v_status = 'suspended' then
      raise exception
        'Suspended clinic affiliation cannot be reclaimed directly';
    end if;


    update public.clinic_members
    set
      designation = p_designation,
      is_public = p_is_public,
      is_primary = false,
      membership_status = 'pending',
      claim_source = 'self_claim',
      invited_by = null,
      confirmed_by = null,
      confirmed_at = null,
      start_date = null,
      end_date = null
    where clinic_id = p_clinic_id
      and professional_user_id = auth.uid();

  else

    insert into public.clinic_members (
      clinic_id,
      professional_user_id,
      designation,
      is_public,
      is_primary,
      membership_status,
      claim_source
    )
    values (
      p_clinic_id,
      auth.uid(),
      p_designation,
      p_is_public,
      false,
      'pending',
      'self_claim'
    );

  end if;

end;
$$;


revoke all
on function public.request_clinic_membership(
  uuid,
  text,
  boolean
)
from public;


grant execute
on function public.request_clinic_membership(
  uuid,
  text,
  boolean
)
to authenticated;


-- ============================================================
-- 9. CLINIC INVITES PROFESSIONAL
-- ============================================================

create or replace function public.invite_clinic_member(
  p_clinic_id uuid,
  p_professional_user_id uuid,
  p_designation text default null,
  p_is_public boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_source text;
begin

  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;


  if not public.can_manage_clinic(p_clinic_id) then
    raise exception
      'Not authorized to invite clinic professionals';
  end if;


  if not exists (
    select 1
    from public.professional_profiles pp
    where pp.user_id = p_professional_user_id
  ) then
    raise exception
      'The invited user must have a professional profile';
  end if;


  select
    cm.membership_status,
    cm.claim_source
  into
    v_status,
    v_source
  from public.clinic_members cm
  where cm.clinic_id = p_clinic_id
    and cm.professional_user_id = p_professional_user_id
  for update;


  if found then

    if v_status = 'active' then
      raise exception
        'Professional already has an active clinic affiliation';
    end if;


    if v_status = 'pending'
       and v_source = 'self_claim'
    then
      raise exception
        'Professional already has a pending self-claim; review that claim instead';
    end if;


    update public.clinic_members
    set
      designation = p_designation,
      is_public = p_is_public,
      is_primary = false,
      membership_status = 'pending',
      claim_source = 'clinic_invitation',
      invited_by = auth.uid(),
      confirmed_by = null,
      confirmed_at = null,
      start_date = null,
      end_date = null
    where clinic_id = p_clinic_id
      and professional_user_id =
        p_professional_user_id;

  else

    insert into public.clinic_members (
      clinic_id,
      professional_user_id,
      designation,
      is_public,
      is_primary,
      membership_status,
      claim_source,
      invited_by
    )
    values (
      p_clinic_id,
      p_professional_user_id,
      p_designation,
      p_is_public,
      false,
      'pending',
      'clinic_invitation',
      auth.uid()
    );

  end if;

end;
$$;


revoke all
on function public.invite_clinic_member(
  uuid,
  uuid,
  text,
  boolean
)
from public;


grant execute
on function public.invite_clinic_member(
  uuid,
  uuid,
  text,
  boolean
)
to authenticated;


-- ============================================================
-- 10. PROFESSIONAL RESPONDS TO CLINIC INVITATION
-- ============================================================

create or replace function public.respond_clinic_invitation(
  p_clinic_id uuid,
  p_accept boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_membership public.clinic_members%rowtype;
begin

  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;


  select *
  into v_membership
  from public.clinic_members cm
  where cm.clinic_id = p_clinic_id
    and cm.professional_user_id = auth.uid()
  for update;


  if not found then
    raise exception 'Clinic invitation not found';
  end if;


  if v_membership.claim_source
       <> 'clinic_invitation'
  then
    raise exception
      'This clinic affiliation is not an invitation';
  end if;


  if v_membership.membership_status
       <> 'pending'
  then
    raise exception
      'Clinic invitation is no longer pending';
  end if;


  if p_accept then

    update public.clinic_members
    set
      membership_status = 'active',
      start_date =
        coalesce(start_date, current_date),
      end_date = null,
      confirmed_by = auth.uid(),
      confirmed_at = now()
    where clinic_id = p_clinic_id
      and professional_user_id = auth.uid();

  else

    update public.clinic_members
    set
      membership_status = 'rejected',
      is_public = false,
      is_primary = false,
      confirmed_by = auth.uid(),
      confirmed_at = now()
    where clinic_id = p_clinic_id
      and professional_user_id = auth.uid();

  end if;

end;
$$;


revoke all
on function public.respond_clinic_invitation(
  uuid,
  boolean
)
from public;


grant execute
on function public.respond_clinic_invitation(
  uuid,
  boolean
)
to authenticated;


-- ============================================================
-- 11. CLINIC REVIEWS PROFESSIONAL SELF-CLAIM
-- ============================================================

create or replace function public.review_clinic_membership_claim(
  p_clinic_id uuid,
  p_professional_user_id uuid,
  p_approve boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_membership public.clinic_members%rowtype;
begin

  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;


  if not public.can_manage_clinic(p_clinic_id) then
    raise exception
      'Not authorized to review clinic affiliation claims';
  end if;


  select *
  into v_membership
  from public.clinic_members cm
  where cm.clinic_id = p_clinic_id
    and cm.professional_user_id =
      p_professional_user_id
  for update;


  if not found then
    raise exception
      'Clinic affiliation claim not found';
  end if;


  if v_membership.claim_source <> 'self_claim' then
    raise exception
      'This clinic affiliation is not a self-claim';
  end if;


  if v_membership.membership_status <> 'pending' then
    raise exception
      'Clinic affiliation claim is no longer pending';
  end if;


  if p_approve then

    update public.clinic_members
    set
      membership_status = 'active',
      start_date =
        coalesce(start_date, current_date),
      end_date = null,
      confirmed_by = auth.uid(),
      confirmed_at = now()
    where clinic_id = p_clinic_id
      and professional_user_id =
        p_professional_user_id;

  else

    update public.clinic_members
    set
      membership_status = 'rejected',
      is_public = false,
      is_primary = false,
      confirmed_by = auth.uid(),
      confirmed_at = now()
    where clinic_id = p_clinic_id
      and professional_user_id =
        p_professional_user_id;

  end if;

end;
$$;


revoke all
on function public.review_clinic_membership_claim(
  uuid,
  uuid,
  boolean
)
from public;


grant execute
on function public.review_clinic_membership_claim(
  uuid,
  uuid,
  boolean
)
to authenticated;


-- ============================================================
-- 12. PROFESSIONAL CONTROLS THEIR PUBLIC AFFILIATION
-- ============================================================

create or replace function public.set_clinic_member_visibility(
  p_clinic_id uuid,
  p_is_public boolean
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


  if not exists (
    select 1
    from public.clinic_members cm
    where cm.clinic_id = p_clinic_id
      and cm.professional_user_id = auth.uid()
      and cm.membership_status = 'active'
  ) then
    raise exception
      'Active clinic affiliation not found';
  end if;


  update public.clinic_members
  set
    is_public = p_is_public,
    is_primary =
      case
        when p_is_public then is_primary
        else false
      end
  where clinic_id = p_clinic_id
    and professional_user_id = auth.uid();

end;
$$;


revoke all
on function public.set_clinic_member_visibility(
  uuid,
  boolean
)
from public;


grant execute
on function public.set_clinic_member_visibility(
  uuid,
  boolean
)
to authenticated;


-- ============================================================
-- 13. CLINIC SETS PRIMARY PUBLIC PROFESSIONAL
-- ============================================================

create or replace function public.set_clinic_primary_member(
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
    raise exception
      'Not authorized to manage clinic professionals';
  end if;


  if not exists (
    select 1
    from public.clinic_members cm
    where cm.clinic_id = p_clinic_id
      and cm.professional_user_id =
        p_professional_user_id
      and cm.membership_status = 'active'
      and cm.is_public = true
  ) then
    raise exception
      'Primary clinic professional must have an active public affiliation';
  end if;


  update public.clinic_members
  set is_primary = false
  where clinic_id = p_clinic_id
    and is_primary = true;


  update public.clinic_members
  set is_primary = true
  where clinic_id = p_clinic_id
    and professional_user_id =
      p_professional_user_id;

end;
$$;


revoke all
on function public.set_clinic_primary_member(
  uuid,
  uuid
)
from public;


grant execute
on function public.set_clinic_primary_member(
  uuid,
  uuid
)
to authenticated;


-- ============================================================
-- 14. HARDEN CLINIC MEMBERSHIP RLS
--
-- Ordinary writes go through controlled functions.
-- ============================================================

drop policy if exists clinic_members_owner_or_admin
on public.clinic_members;


drop policy if exists clinic_members_select_self
on public.clinic_members;

create policy clinic_members_select_self
on public.clinic_members
for select
to authenticated
using (
  professional_user_id = auth.uid()
);


drop policy if exists clinic_members_select_managers
on public.clinic_members;

create policy clinic_members_select_managers
on public.clinic_members
for select
to authenticated
using (
  public.can_manage_clinic(clinic_id)
);


drop policy if exists clinic_members_select_reviewers
on public.clinic_members;

create policy clinic_members_select_reviewers
on public.clinic_members
for select
to authenticated
using (
  public.can_verify()
);


drop policy if exists clinic_members_admin_all
on public.clinic_members;

create policy clinic_members_admin_all
on public.clinic_members
for all
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);


commit;
