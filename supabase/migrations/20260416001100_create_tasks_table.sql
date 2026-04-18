-- Tasks table with bilingual names, shared defaults, and per-user custom tasks.

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_en text not null,
  name_da text not null,
  is_default boolean not null default false,
  owner_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_name_not_blank check (length(trim(name)) > 0),
  constraint tasks_name_en_not_blank check (length(trim(name_en)) > 0),
  constraint tasks_name_da_not_blank check (length(trim(name_da)) > 0),
  constraint tasks_default_owner_consistency check (
    (is_default = true and owner_id is null)
    or
    (is_default = false and owner_id is not null)
  )
);

create unique index if not exists tasks_default_name_en_unique_idx
  on public.tasks (lower(name_en))
  where is_default = true;

create unique index if not exists tasks_default_name_da_unique_idx
  on public.tasks (lower(name_da))
  where is_default = true;

create unique index if not exists tasks_owner_name_en_unique_idx
  on public.tasks (owner_id, lower(name_en))
  where is_default = false;

create unique index if not exists tasks_owner_name_da_unique_idx
  on public.tasks (owner_id, lower(name_da))
  where is_default = false;

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
before update on public.tasks
for each row
execute function public.set_updated_at();

alter table public.tasks enable row level security;

-- Everyone authenticated can read shared defaults and their own custom tasks.
drop policy if exists "Users can read default and own tasks" on public.tasks;
create policy "Users can read default and own tasks"
on public.tasks
for select
using (
  is_default = true
  or owner_id = (select auth.uid())
);

-- Users can create only their own non-default tasks.
drop policy if exists "Users can insert own custom tasks" on public.tasks;
create policy "Users can insert own custom tasks"
on public.tasks
for insert
with check (
  is_default = false
  and owner_id = (select auth.uid())
);

-- Users can update only their own non-default tasks.
drop policy if exists "Users can update own custom tasks" on public.tasks;
create policy "Users can update own custom tasks"
on public.tasks
for update
using (
  is_default = false
  and owner_id = (select auth.uid())
)
with check (
  is_default = false
  and owner_id = (select auth.uid())
);

-- Users can delete only their own non-default tasks.
drop policy if exists "Users can delete own custom tasks" on public.tasks;
create policy "Users can delete own custom tasks"
on public.tasks
for delete
using (
  is_default = false
  and owner_id = (select auth.uid())
);

-- Admins can manage default tasks.
drop policy if exists "Admins can insert default tasks" on public.tasks;
create policy "Admins can insert default tasks"
on public.tasks
for insert
with check (
  public.is_admin((select auth.uid()))
  and is_default = true
  and owner_id is null
);

drop policy if exists "Admins can update default tasks" on public.tasks;
create policy "Admins can update default tasks"
on public.tasks
for update
using (
  public.is_admin((select auth.uid()))
  and is_default = true
  and owner_id is null
)
with check (
  public.is_admin((select auth.uid()))
  and is_default = true
  and owner_id is null
);

drop policy if exists "Admins can delete default tasks" on public.tasks;
create policy "Admins can delete default tasks"
on public.tasks
for delete
using (
  public.is_admin((select auth.uid()))
  and is_default = true
  and owner_id is null
);

grant select, insert, update, delete on table public.tasks to authenticated;

-- Seed default tasks.
insert into public.tasks (name, name_en, name_da, is_default, owner_id)
values
  ('Vacuum floors', 'Vacuum floors', 'Støvsug gulve', true, null),
  ('Mop floors', 'Mop floors', 'Vask gulve', true, null),
  ('Dust surfaces', 'Dust surfaces', 'Tør støv af overflader', true, null),
  ('Clean bathroom sink', 'Clean bathroom sink', 'Rengør badeværelsesvask', true, null),
  ('Empty trash bins', 'Empty trash bins', 'Tøm skraldespande', true, null)
on conflict do nothing;
