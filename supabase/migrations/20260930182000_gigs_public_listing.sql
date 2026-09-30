-- Schema only for gigs listed from a public source. No seed rows are inserted.
--
-- source_url is the page the listing was copied from.
-- source_kind tells a public listing apart from a performer-posted gig:
--   public_info  unclaimed copy of a public listing; source_url is required
--   owner        posted by the performer
--   null         legacy row (the Austin demo). Readers treat null as owner.
--
-- This is an explicit column, not "performers.user_id is null". That column
-- belongs to the auth work, and a later claim on the performer must not
-- relabel gigs that were copied from a public page. Austin demo rows stay
-- null here; they are not public listings.
--
-- Both columns are nullable, so existing rows need no backfill.
-- Safe to re-run. Does not touch storage.objects.

alter table public.gigs
  add column if not exists source_url text;

alter table public.gigs
  add column if not exists source_kind text;

alter table public.gigs drop constraint if exists gigs_source_kind_check;
alter table public.gigs
  add constraint gigs_source_kind_check
  check (source_kind is null or source_kind in ('owner', 'public_info'));

alter table public.gigs drop constraint if exists gigs_source_url_check;
alter table public.gigs
  add constraint gigs_source_url_check
  check (
    source_url is null
    or (
      char_length(source_url) between 12 and 2000
      and source_url ~ '^https://[^[:space:]]+$'
    )
  );

alter table public.gigs drop constraint if exists gigs_public_info_has_source_check;
alter table public.gigs
  add constraint gigs_public_info_has_source_check
  check (source_kind is distinct from 'public_info' or source_url is not null);

comment on column public.gigs.source_url is
  'Public page a listing was copied from. Required when source_kind is public_info. Null on performer-posted gigs.';

comment on column public.gigs.source_kind is
  'public_info: unclaimed listing copied from a public source. owner: posted by the performer. Null: legacy row, treated as owner. Independent of who owns the performer profile.';
