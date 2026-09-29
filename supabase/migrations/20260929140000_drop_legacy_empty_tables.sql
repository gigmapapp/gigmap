-- Drop empty legacy tables before 20260929150000_create_gigmap_tables.sql.
--
-- The hosted project already has a different schema, all currently empty:
--   public.profiles(id uuid PK references auth.users, display_name, is_musician, ...)
--   public.gigs(musician_id FK profiles, venue_name, gig_date, ...)
--   public.bookings(musician_id FK profiles, requester_id FK profiles, ...)
-- The v1 migration creates its own public.gigs, so the old table has to go first.
-- A fresh database (including `supabase db reset`) does not have these tables.
-- This file is a no-op there.
--
-- Safety:
--   1. Consider a table only when it is an ordinary table with the legacy shape
--      (bookings.requester_id, gigs.musician_id, profiles.is_musician).
--      The v1 public.gigs table has performer_id instead of musician_id, so a
--      second run after the create migration does not drop it.
--   2. Lock and count every matching table before dropping any of them.
--      count(*) runs as the migration role, which bypasses RLS, so rows that
--      the Data API would hide still block the drop.
--   3. If any matching table has a row, raise and stop. The migration transaction
--      rolls back, so nothing is dropped.
--   4. Otherwise drop bookings, then gigs, then profiles. That order removes the
--      foreign keys into profiles first.
--
-- CASCADE is not used. bookings and gigs reference profiles, and profiles.id
-- references auth.users. Dropping the children first clears those foreign keys.
-- Dropping profiles does not drop auth.users. If some other object still depends
-- on one of these tables, Postgres rejects the drop and the transaction rolls
-- back instead of deleting that dependency. auth.users is not modified.

do $$
declare
  spec record;
  rel oid;
  row_count bigint;
  blockers text[] := array[]::text[];
  pending text[] := array[]::text[];
  drop_name text;
begin
  for spec in
    select *
    from (
      values
        ('bookings'::text, 'requester_id'::text),
        ('gigs', 'musician_id'),
        ('profiles', 'is_musician')
    ) as legacy(table_name, legacy_column)
  loop
    rel := null;
    select c.oid
      into rel
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = spec.table_name
      and c.relkind = 'r';

    if not found or rel is null then
      continue;
    end if;

    if not exists (
      select 1
      from pg_attribute a
      where a.attrelid = rel
        and a.attname = spec.legacy_column
        and a.attnum > 0
        and not a.attisdropped
    ) then
      continue;
    end if;

    execute format('lock table public.%I in access exclusive mode', spec.table_name);
    execute format('select count(*) from public.%I', spec.table_name) into row_count;

    if row_count > 0 then
      blockers := array_append(blockers, format('public.%s (%s rows)', spec.table_name, row_count));
    else
      pending := array_append(pending, spec.table_name);
    end if;
  end loop;

  if cardinality(blockers) > 0 then
    raise exception
      'Refusing to drop legacy tables because at least one is not empty: %. Nothing was dropped.',
      array_to_string(blockers, ', ');
  end if;

  foreach drop_name in array pending loop
    execute format('drop table public.%I', drop_name);
  end loop;
end $$;
