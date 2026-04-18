-- Invite-only signup flow.
-- Only allowlisted emails can complete signup.

create table if not exists public.signup_allowlist (
  email text primary key,
  invited_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.signup_allowlist enable row level security;

drop policy if exists "Admins can read signup allowlist" on public.signup_allowlist;
create policy "Admins can read signup allowlist"
on public.signup_allowlist
for select
using (public.is_admin((select auth.uid())));

drop policy if exists "Admins can insert signup allowlist" on public.signup_allowlist;
create policy "Admins can insert signup allowlist"
on public.signup_allowlist
for insert
with check (public.is_admin((select auth.uid())));

drop policy if exists "Admins can delete signup allowlist" on public.signup_allowlist;
create policy "Admins can delete signup allowlist"
on public.signup_allowlist
for delete
using (public.is_admin((select auth.uid())));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is null then
    raise exception 'Email is required';
  end if;

  if not exists (
    select 1
    from public.signup_allowlist s
    where lower(s.email) = lower(new.email)
  ) then
    raise exception 'Signup is invite-only';
  end if;

  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'user')
  on conflict (id) do nothing;

  delete from public.signup_allowlist
  where lower(email) = lower(new.email);

  return new;
end;
$$;

create or replace function public.invite_email(target_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin((select auth.uid())) then
    raise exception 'Only admins can invite users';
  end if;

  if target_email is null or length(trim(target_email)) = 0 then
    raise exception 'Email is required';
  end if;

  insert into public.signup_allowlist (email, invited_by)
  values (lower(trim(target_email)), (select auth.uid()))
  on conflict (email)
  do update set invited_by = excluded.invited_by, created_at = now();
end;
$$;

create or replace function public.revoke_invite(target_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin((select auth.uid())) then
    raise exception 'Only admins can revoke invites';
  end if;

  delete from public.signup_allowlist
  where lower(email) = lower(trim(target_email));
end;
$$;

create or replace function public.list_invites()
returns table (email text, created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select s.email, s.created_at
  from public.signup_allowlist s
  where public.is_admin((select auth.uid()))
  order by s.created_at desc;
$$;

revoke all on function public.invite_email(text) from public;
revoke all on function public.revoke_invite(text) from public;
revoke all on function public.list_invites() from public;
grant execute on function public.invite_email(text) to authenticated;
grant execute on function public.revoke_invite(text) to authenticated;
grant execute on function public.list_invites() to authenticated;
