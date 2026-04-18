-- Optimize RLS policies by avoiding per-row auth.uid() evaluation.
-- Replace auth.uid() with (select auth.uid()) in policy expressions.

drop policy if exists "Users or admins can read profiles" on public.profiles;
create policy "Users or admins can read profiles"
on public.profiles
for select
using (
  (select auth.uid()) = id
  or public.is_admin((select auth.uid()))
);

drop policy if exists "Users or admins can update profiles" on public.profiles;
create policy "Users or admins can update profiles"
on public.profiles
for update
using (
  (select auth.uid()) = id
  or public.is_admin((select auth.uid()))
)
with check (
  public.is_admin((select auth.uid()))
  or (
    (select auth.uid()) = id
    and role = (
      select p.role
      from public.profiles p
      where p.id = (select auth.uid())
    )
  )
);
