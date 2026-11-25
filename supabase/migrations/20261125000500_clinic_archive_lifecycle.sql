begin;

alter table public.clinics add column archived_at timestamptz;
alter table public.clinics add constraint clinics_archive_requires_unpublished
  check (archived_at is null or not is_published);

create function public.enforce_clinic_archive_lifecycle()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.archived_at is not null and old.archived_at is null then
      new.archived_at := statement_timestamp();
      new.is_published := false;
    elsif old.archived_at is not null and new.is_published then
      raise exception 'Restore the clinic before publishing it';
    end if;
  elsif new.archived_at is not null and new.is_published then
    raise exception 'An archived clinic cannot be published';
  end if;
  return new;
end;
$$;

-- The review guard runs first. The archive transition can only withdraw publication.
create trigger clinics_z_archive_lifecycle
before insert or update on public.clinics
for each row execute function public.enforce_clinic_archive_lifecycle();

revoke execute on function public.enforce_clinic_archive_lifecycle() from public, anon, authenticated;

commit;
