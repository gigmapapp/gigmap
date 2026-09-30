-- Fill gigs.timezone in SQL so 20260930181000 can set NOT NULL.
--
-- Apply after 20260930180000_gigs_add_timezone.sql and before
-- 20260930181000_gigs_timezone_not_null.sql. No service-role key.
--
-- On the hosted project every current gig is an Austin seed row or the
-- Milestone gig 1139b90f-1953-4ace-bc83-5296df2a2f5d. The swap migration
-- deletes both. Those ids are set explicitly:
--   Milestone (Connecticut) -> America/New_York
--   Austin seed gig ids     -> America/Chicago
--
-- Any other null row uses a coarse longitude cut, not a zone boundary:
-- America/New_York when lng > -87.5, otherwise America/Chicago. Chicago is
-- about -87.6, so it stays Central. Connecticut and the rest of the Eastern
-- seaboard stay Eastern. This mis-labels Indiana and the Florida panhandle.
-- Those rows are not on the hosted project.
--
-- Ends by raising if any timezone is still null, so the NOT NULL migration
-- cannot fail for a missing zone. Safe to re-run: known ids are set again,
-- and the fallback only fills nulls.
--
-- Does not touch storage.objects. Does not edit earlier migrations.
-- Never re-run 20260929160000_revoke_anon_table_writes.sql after
-- 20260930120600_performer_auth_ownership.sql (PR #10).
--
-- scripts/backfill-gig-timezones.ts is an optional dev tool. It is not a
-- production step.

update public.gigs
set timezone = 'America/New_York'
where id = '1139b90f-1953-4ace-bc83-5296df2a2f5d';

update public.gigs
set timezone = 'America/Chicago'
where id in (
  'gig-antones-maya',
  'gig-stubbs-rio',
  'gig-mohawk-velvet',
  'gig-empire-nova',
  'gig-continental-broken',
  'gig-cboy-elijah',
  'gig-saxon-harper',
  'gig-whitehorse-copper',
  'gig-parish-bassline',
  'gig-hotelvegas-maya',
  'gig-cheerup-luna',
  'gig-acl-velvet'
);

update public.gigs
set timezone = case
  when lng > -87.5 then 'America/New_York'
  else 'America/Chicago'
end
where timezone is null;

do $$
begin
  if exists (select 1 from public.gigs where timezone is null) then
    raise exception
      'gigs.timezone is still null after the SQL backfill. 20260930181000_gigs_timezone_not_null.sql was not applied.';
  end if;
end
$$;
