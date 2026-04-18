-- Rooms table with shared defaults + per-user private custom rooms.

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_default boolean not null default false,
  owner_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rooms_name_not_blank check (length(trim(name)) > 0),
  constraint rooms_default_owner_consistency check (
    (is_default = true and owner_id is null)
    or
    (is_default = false and owner_id is not null)
  )
);

create unique index if not exists rooms_default_name_unique_idx
  on public.rooms (lower(name))
  where is_default = true;

create unique index if not exists rooms_owner_name_unique_idx
  on public.rooms (owner_id, lower(name))
  where is_default = false;

drop trigger if exists rooms_set_updated_at on public.rooms;
create trigger rooms_set_updated_at
before update on public.rooms
for each row
execute function public.set_updated_at();

alter table public.rooms enable row level security;

-- Everyone authenticated can read shared defaults and their own custom rooms.
drop policy if exists "Users can read default and own rooms" on public.rooms;
create policy "Users can read default and own rooms"
on public.rooms
for select
using (
  is_default = true
  or owner_id = (select auth.uid())
);

-- Users can create only their own non-default rooms.
drop policy if exists "Users can insert own custom rooms" on public.rooms;
create policy "Users can insert own custom rooms"
on public.rooms
for insert
with check (
  is_default = false
  and owner_id = (select auth.uid())
);

-- Users can update only their own non-default rooms.
drop policy if exists "Users can update own custom rooms" on public.rooms;
create policy "Users can update own custom rooms"
on public.rooms
for update
using (
  is_default = false
  and owner_id = (select auth.uid())
)
with check (
  is_default = false
  and owner_id = (select auth.uid())
);

-- Users can delete only their own non-default rooms.
drop policy if exists "Users can delete own custom rooms" on public.rooms;
create policy "Users can delete own custom rooms"
on public.rooms
for delete
using (
  is_default = false
  and owner_id = (select auth.uid())
);

grant select, insert, update, delete on table public.rooms to authenticated;

-- Seed default rooms (visible to all authenticated users).
insert into public.rooms (name, is_default, owner_id)
values
  ('Kitchen', true, null),
  ('Bathroom', true, null),
  ('Living Room', true, null),
  ('Bedroom', true, null),
  ('Hallway', true, null)
on conflict do nothing;
