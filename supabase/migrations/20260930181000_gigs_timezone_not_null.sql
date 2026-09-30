-- Set gigs.timezone NOT NULL.
--
-- Apply after 20260930180500_gigs_backfill_timezone.sql. That file fills
-- every existing row and raises if any timezone is still null, so this
-- file's guard does not fail on the hosted data. If a null is still present
-- this file aborts and leaves the column nullable.
--
-- Fresh database: the table is empty, the backfill updates nothing, and this
-- file only sets NOT NULL. seed.sql and the Mystic swap insert a zone on
-- every new row.
-- Re-running this file after the column is already NOT NULL does nothing.
-- No service-role key. scripts/backfill-gig-timezones.ts is not a prod step.
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
      'gigs.timezone is still null. Apply 20260930180500_gigs_backfill_timezone.sql, then re-apply this file. The column was left nullable.';
  end if;

  alter table public.gigs alter column timezone set not null;
end
$$;
