-- Cleanup: remove obsolete bootstrap-admin artifacts.

revoke execute on function public.claim_bootstrap_admin() from authenticated;
revoke all on function public.claim_bootstrap_admin() from public;

drop function if exists public.claim_bootstrap_admin();
drop table if exists public.admin_bootstrap_allowlist;

drop function if exists public.bootstrap_first_admin();
