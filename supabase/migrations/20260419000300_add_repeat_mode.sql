-- Add repeat_mode to distinguish "every N units" from "N times per unit".

alter table public.schedules
  add column if not exists repeat_mode text not null default 'every';

alter table public.schedules
  add constraint schedules_repeat_mode_valid check (
    repeat_mode in ('every', 'per')
  );

comment on column public.schedules.repeat_mode is '"every" = once per N units, "per" = N times per unit';
