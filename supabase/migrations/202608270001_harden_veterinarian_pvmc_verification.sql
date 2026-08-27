begin;

create or replace function public.reset_pvmc_verification_on_number_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.pvmc_number is distinct from old.pvmc_number then
    new.pvmc_verification_status := 'pending';
    new.pvmc_verified_at := null;
    new.pvmc_verified_by := null;
  end if;

  return new;
end;
$$;

drop trigger if exists zz_vet_profiles_reset_pvmc_verification
on public.veterinarian_profiles;

create trigger zz_vet_profiles_reset_pvmc_verification
before update of pvmc_number
on public.veterinarian_profiles
for each row
execute function public.reset_pvmc_verification_on_number_change();

commit;
