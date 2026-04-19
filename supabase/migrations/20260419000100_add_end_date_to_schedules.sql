-- Add optional end_date to schedules.
-- When null, the schedule repeats indefinitely.

alter table public.schedules
  add column if not exists end_date date;

-- Backfill existing schedules: default end_date = start_date + 1 year.
update public.schedules
set end_date = start_date + interval '1 year'
where end_date is null;

comment on column public.schedules.end_date is 'Optional end date for the recurring schedule. NULL means indefinite.';
