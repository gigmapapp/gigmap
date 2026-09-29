-- Revoke EXECUTE on public.rls_auto_enable() from anon, authenticated, and PUBLIC.
--
-- The hosted project already has this function. These migrations do not create it,
-- and this file does not drop it or change its body. A fresh database, including
-- `supabase db reset`, has no such function; the loop finds nothing and returns.

do $$
declare
  fn regprocedure;
begin
  for fn in
    select p.oid::regprocedure
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'rls_auto_enable'
  loop
    execute format(
      'revoke execute on function %s from public, anon, authenticated',
      fn
    );
  end loop;
end $$;
