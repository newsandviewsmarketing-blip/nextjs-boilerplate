revoke insert,update,delete on table public.team_members from anon;
grant select on table public.team_members to anon;
grant select,insert,update,delete on table public.team_members to authenticated;