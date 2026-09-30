-- Add gigs.timezone (IANA name) for the venue of each gig.
--
-- Nullable in this file. The next migration,
-- 20260930180500_gigs_backfill_timezone.sql, fills every existing row in SQL.
-- Then 20260930181000_gigs_timezone_not_null.sql sets NOT NULL.
-- On an empty database the backfill updates nothing and the assertion passes.
--
-- Safe to re-run. The column, check, function, and trigger are replaced in
-- place. This file does not touch storage.objects and does not edit earlier
-- migrations.
--
-- Do not re-run 20260929160000_revoke_anon_table_writes.sql after
-- 20260930120600_performer_auth_ownership.sql (PR #10) has been applied.
-- That revoke drops the owner write policies the ownership migration adds.

alter table public.gigs
  add column if not exists timezone text;

alter table public.gigs drop constraint if exists gigs_timezone_format_check;
alter table public.gigs
  add constraint gigs_timezone_format_check
  check (
    timezone is null
    or timezone ~ '^(Africa|America|Antarctica|Arctic|Asia|Atlantic|Australia|Europe|Indian|Pacific)/[A-Za-z0-9_+-]+(/[A-Za-z0-9_+-]+){0,1}$'
  );

comment on column public.gigs.timezone is
  'IANA time zone of the venue. Null only until 20260930180500_gigs_backfill_timezone.sql runs. datetime is the UTC instant of that zone''s wall clock.';

-- CHECK cannot subquery pg_timezone_names. This trigger asks Postgres whether
-- the name is one it can use (the same set as pg_timezone_names, minus
-- abbreviations already rejected by the format check). Cheap: one catalog
-- lookup per insert or timezone update.
create or replace function public.gigs_reject_unknown_timezone()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if new.timezone is null then
    return new;
  end if;
  begin
    perform pg_catalog.timezone(new.timezone, pg_catalog.now());
  exception
    when invalid_parameter_value then
      raise exception 'gigs.timezone "%" is not a time zone name Postgres recognizes', new.timezone
        using errcode = '22023';
  end;
  return new;
end;
$$;

comment on function public.gigs_reject_unknown_timezone() is
  'Rejects gigs.timezone values Postgres does not recognize. Not an API.';

revoke all on function public.gigs_reject_unknown_timezone() from public;
revoke all on function public.gigs_reject_unknown_timezone() from anon, authenticated;
grant execute on function public.gigs_reject_unknown_timezone() to service_role;

drop trigger if exists gigs_timezone_known on public.gigs;
create trigger gigs_timezone_known
  before insert or update of timezone on public.gigs
  for each row
  execute function public.gigs_reject_unknown_timezone();
