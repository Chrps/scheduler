-- Schedules table: recurring cleaning assignments.
-- Each schedule ties a task to an optional room with a recurrence pattern.

create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  room_id uuid references public.rooms(id) on delete set null,
  start_date date not null,
  interval text not null default 'weekly',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedules_interval_valid check (
    interval in ('daily', 'weekly', 'biweekly', 'monthly')
  )
);

create index if not exists schedules_owner_idx on public.schedules (owner_id);
create index if not exists schedules_start_date_idx on public.schedules (start_date);

drop trigger if exists schedules_set_updated_at on public.schedules;
create trigger schedules_set_updated_at
before update on public.schedules
for each row
execute function public.set_updated_at();

alter table public.schedules enable row level security;

-- Users can only see their own schedules.
drop policy if exists "Users can read own schedules" on public.schedules;
create policy "Users can read own schedules"
on public.schedules for select
using (owner_id = (select auth.uid()));

-- Users can create their own schedules.
drop policy if exists "Users can insert own schedules" on public.schedules;
create policy "Users can insert own schedules"
on public.schedules for insert
with check (owner_id = (select auth.uid()));

-- Users can update their own schedules.
drop policy if exists "Users can update own schedules" on public.schedules;
create policy "Users can update own schedules"
on public.schedules for update
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

-- Users can delete their own schedules.
drop policy if exists "Users can delete own schedules" on public.schedules;
create policy "Users can delete own schedules"
on public.schedules for delete
using (owner_id = (select auth.uid()));

grant select, insert, update, delete on table public.schedules to authenticated;
