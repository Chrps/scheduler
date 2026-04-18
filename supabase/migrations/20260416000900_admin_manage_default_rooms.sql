-- Allow admins to manage shared default rooms.

-- Admins can insert default rooms.
drop policy if exists "Admins can insert default rooms" on public.rooms;
create policy "Admins can insert default rooms"
on public.rooms
for insert
with check (
  public.is_admin((select auth.uid()))
  and is_default = true
  and owner_id is null
);

-- Admins can update default rooms (e.g. rename).
drop policy if exists "Admins can update default rooms" on public.rooms;
create policy "Admins can update default rooms"
on public.rooms
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

-- Admins can delete default rooms.
drop policy if exists "Admins can delete default rooms" on public.rooms;
create policy "Admins can delete default rooms"
on public.rooms
for delete
using (
  public.is_admin((select auth.uid()))
  and is_default = true
  and owner_id is null
);
