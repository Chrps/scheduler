-- Add language_preference column to profiles table
alter table public.profiles
add column if not exists language_preference text default 'en' check (language_preference in ('en', 'da'));

-- Add comment
comment on column public.profiles.language_preference is 'User language preference: en (English) or da (Danish)';
