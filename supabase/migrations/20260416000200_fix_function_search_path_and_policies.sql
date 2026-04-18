-- Fix security advisor findings:
-- 1) set stable search_path for trigger function
-- 2) avoid multiple permissive UPDATE/SELECT policies on profiles

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Replace overlapping SELECT policies with one consolidated policy

drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Admins can read all profiles" on public.profiles;

create policy "Users or admins can read profiles"
on public.profiles
for select
using (
  auth.uid() = id
  or public.is_admin(auth.uid())
);

-- Replace overlapping UPDATE policies with one consolidated policy

drop policy if exists "Users can update own non-role fields" on public.profiles;
drop policy if exists "Admins can update all profiles" on public.profiles;

create policy "Users or admins can update profiles"
on public.profiles
for update
using (
  auth.uid() = id
  or public.is_admin(auth.uid())
)
with check (
  public.is_admin(auth.uid())
  or (
    auth.uid() = id
    and role = (select p.role from public.profiles p where p.id = auth.uid())
  )
);
