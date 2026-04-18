-- Add bilingual room names (English + Danish) and keep legacy `name` in sync.

alter table public.rooms
  add column if not exists name_en text,
  add column if not exists name_da text;

-- Backfill from existing data.
update public.rooms
set
  name_en = coalesce(name_en, name),
  name_da = coalesce(
    name_da,
    case lower(name)
      when 'kitchen' then 'Køkken'
      when 'bathroom' then 'Badeværelse'
      when 'living room' then 'Stue'
      when 'bedroom' then 'Soveværelse'
      when 'hallway' then 'Gang'
      else name
    end
  );

alter table public.rooms
  alter column name_en set not null,
  alter column name_da set not null;

alter table public.rooms
  add constraint rooms_name_en_not_blank check (length(trim(name_en)) > 0),
  add constraint rooms_name_da_not_blank check (length(trim(name_da)) > 0);

-- Replace old uniqueness strategy based on `name` with bilingual uniqueness.
drop index if exists rooms_default_name_unique_idx;
drop index if exists rooms_owner_name_unique_idx;

create unique index if not exists rooms_default_name_en_unique_idx
  on public.rooms (lower(name_en))
  where is_default = true;

create unique index if not exists rooms_default_name_da_unique_idx
  on public.rooms (lower(name_da))
  where is_default = true;

create unique index if not exists rooms_owner_name_en_unique_idx
  on public.rooms (owner_id, lower(name_en))
  where is_default = false;

create unique index if not exists rooms_owner_name_da_unique_idx
  on public.rooms (owner_id, lower(name_da))
  where is_default = false;

-- Keep legacy `name` populated from English for backward compatibility.
update public.rooms
set name = name_en
where name is distinct from name_en;
