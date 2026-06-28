alter table public.profiles
  add column if not exists display_name text,
  add column if not exists username text,
  add column if not exists updated_at timestamptz default now();

create unique index if not exists profiles_username_unique_idx
  on public.profiles (lower(username))
  where username is not null and username <> '';

comment on column public.profiles.display_name is 'Name shown in user pickers and staff lists.';
comment on column public.profiles.username is 'Short user handle shown below display name.';
