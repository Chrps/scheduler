-- Secure bootstrap flow: only pre-authorized user can claim the first admin role.

create table if not exists public.admin_bootstrap_allowlist (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  used_at timestamptz
);

create or replace function public.claim_bootstrap_admin()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := (select auth.uid());
begin
  if caller_id is null then
    raise exception 'Authentication required';
  end if;

  if exists (select 1 from public.profiles where role = 'admin') then
    raise exception 'An admin already exists';
  end if;

  if not exists (
    select 1
    from public.admin_bootstrap_allowlist a
    where a.user_id = caller_id and a.used_at is null
  ) then
    raise exception 'Not authorized for bootstrap admin';
  end if;

  update public.profiles
  set role = 'admin'
  where id = caller_id;

  if not found then
    raise exception 'Profile not found for authenticated user';
  end if;

  update public.admin_bootstrap_allowlist
  set used_at = now()
  where user_id = caller_id and used_at is null;
end;
$$;

revoke all on function public.claim_bootstrap_admin() from public;
grant execute on function public.claim_bootstrap_admin() to authenticated;

-- Disable the broad bootstrap function so only the allowlisted flow can be used.
revoke execute on function public.bootstrap_first_admin() from authenticated;
