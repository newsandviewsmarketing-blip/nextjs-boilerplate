-- Public team portfolio enhancement; retains all existing members, publication status and photos.
alter table public.team_members
  add column if not exists team_group text not null default 'team',
  add column if not exists seo_title text not null default '',
  add column if not exists seo_description text not null default '',
  add column if not exists website_url text,
  add column if not exists facebook_url text,
  add column if not exists photo_position_y integer not null default 30;
alter table public.team_members drop constraint if exists team_members_group_valid;
alter table public.team_members add constraint team_members_group_valid
 check (team_group in ('chairman','founder','leadership','management','team','advisors'));
alter table public.team_members drop constraint if exists team_members_seo_limits;
alter table public.team_members add constraint team_members_seo_limits
 check (char_length(seo_title) <= 160 and char_length(seo_description) <= 300 and photo_position_y between 0 and 100);
-- Earlier schema defaults are kept, and the public page always filters is_published=true.
create index if not exists team_members_group_order_idx on public.team_members(team_group,sort_order,full_name);
