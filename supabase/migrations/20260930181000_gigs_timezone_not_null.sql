-- Set gigs.timezone NOT NULL after every existing row has a zone.
--
-- Production, when public.gigs already has rows:
--   1. Apply 20260930180000_gigs_add_timezone.sql (column stays nullable).
--   2. Run: npx tsx scripts/backfill-gig-timezones.ts
--      (or npm run backfill:timezones). --dry-run prints the plan.
--   3. Apply this file. If any timezone is still null it aborts and leaves
--      the column nullable, so it can be retried after the backfill.
--
-- Fresh database (supabase db reset): the table is empty here, so this file
-- only sets NOT NULL. seed.sql then inserts a zone for every Austin gig.
-- Re-running this file after the column is already NOT NULL does nothing.
--
-- Does not touch storage.objects. Does not re-run earlier migrations.
-- Never re-run 20260929160000_revoke_anon_table_writes.sql after
-- 20260930120600_performer_auth_ownership.sql (PR #10).

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'gigs'
      and column_name = 'timezone'
      and is_nullable = 'NO'
  ) then
    return;
  end if;

  if exists (select 1 from public.gigs where timezone is null) then
    raise exception
      'gigs.timezone is null on existing rows. Run scripts/backfill-gig-timezones.ts, then re-apply 20260930181000_gigs_timezone_not_null.sql. The column was left nullable.';
  end if;

  alter table public.gigs alter column timezone set not null;
end
$$;
