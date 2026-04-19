-- Replace the fixed interval text column with flexible repeat_every + repeat_unit.
-- This allows "every N day/week/month/quarter/year" patterns.

-- Add new columns
alter table public.schedules
  add column if not exists repeat_every integer not null default 1,
  add column if not exists repeat_unit text not null default 'week';

-- Migrate existing data
update public.schedules set repeat_every = 1, repeat_unit = 'day'     where interval = 'daily';
update public.schedules set repeat_every = 1, repeat_unit = 'week'    where interval = 'weekly';
update public.schedules set repeat_every = 2, repeat_unit = 'week'    where interval = 'biweekly';
update public.schedules set repeat_every = 1, repeat_unit = 'month'   where interval = 'monthly';

-- Add constraint for valid units
alter table public.schedules
  add constraint schedules_repeat_unit_valid check (
    repeat_unit in ('day', 'week', 'month', 'quarter', 'year')
  );

-- Ensure repeat_every is positive
alter table public.schedules
  add constraint schedules_repeat_every_positive check (repeat_every > 0);

-- Drop old interval column and its constraint
alter table public.schedules drop constraint if exists schedules_interval_valid;
alter table public.schedules drop column if exists interval;
