-- Link a performer profile to a Supabase Auth user.
--
-- Apply after 20260929170000_revoke_rls_auto_enable.sql. This file does not touch
-- storage.objects or storage.buckets. Do not ALTER those tables.
--
-- performers.user_id is null for the seeded demo profiles. Null means
-- unclaimed: the row stays publicly readable and no authenticated user can
-- update, delete, or attach gigs, clips, or readable booking requests to it.
-- One non-null user_id per profile (unique). Deleting the auth user sets
-- user_id back to null instead of deleting the public profile.
--
-- anon keeps SELECT on performers, videos, and gigs, and has no writes.
-- authenticated may write only rows it owns. booking_requests stay
-- unwritable by anon and authenticated; the service role inserts them after
-- the app checks the performer is claimed. authenticated may SELECT a
-- booking request only when they own that performer.
--
-- auth.uid() is wrapped in a scalar subquery so the planner evaluates it
-- once per statement. Policies are inlined rather than a SECURITY DEFINER
-- helper in public (that schema is exposed through the Data API).
--
-- Idempotent: the column and unique index use IF NOT EXISTS, the foreign key
-- is added only when missing, and policies are dropped before create.
-- Grants can be repeated.
--
-- Do not re-run 20260929160000_revoke_anon_table_writes.sql after this file.
-- That migration drops every INSERT, UPDATE, DELETE, and FOR ALL policy on
-- these tables, including the owner policies below. If it is applied again,
-- apply this file again afterwards.

alter table public.performers
  add column if not exists user_id uuid;

-- City is required from the profile form. Seed rows set it explicitly.
-- Drop the Austin default from 20260929150000 so an omitted city cannot sneak in.
alter table public.performers
  alter column city drop default;

do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_attribute a
      on a.attrelid = c.conrelid
     and a.attnum = any (c.conkey)
    where c.conrelid = 'public.performers'::regclass
      and c.contype = 'f'
      and a.attname = 'user_id'
  ) then
    alter table public.performers
      add constraint performers_user_id_fkey
      foreign key (user_id) references auth.users (id) on delete set null;
  end if;
end $$;

-- Unique index also serves lookups by owner. Multiple NULLs stay allowed,
-- so every seed profile can remain unclaimed.
create unique index if not exists performers_user_id_key on public.performers (user_id);

comment on column public.performers.user_id is
  'Owning auth.users id. NULL is an unclaimed demo profile: public, not editable, and not a booking inbox.';

comment on table public.booking_requests is
  'Private. anon has no privileges. authenticated may select rows for a performer they own. Inserts go through the service role after the app rejects unclaimed performers.';

revoke all on table public.performers from public, anon, authenticated;
revoke all on table public.videos from public, anon, authenticated;
revoke all on table public.gigs from public, anon, authenticated;
revoke all on table public.booking_requests from public, anon, authenticated;

grant select on table public.performers to anon, authenticated;
grant select on table public.videos to anon, authenticated;
grant select on table public.gigs to anon, authenticated;

grant insert, update, delete on table public.performers to authenticated;
grant insert, update, delete on table public.videos to authenticated;
grant insert, update, delete on table public.gigs to authenticated;

grant select on table public.booking_requests to authenticated;

-- Public read policies from 20260929150000 stay in place.

drop policy if exists performers_owner_insert on public.performers;
create policy performers_owner_insert
  on public.performers
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists performers_owner_update on public.performers;
create policy performers_owner_update
  on public.performers
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists performers_owner_delete on public.performers;
create policy performers_owner_delete
  on public.performers
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists videos_owner_insert on public.videos;
create policy videos_owner_insert
  on public.videos
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.performers p
      where p.id = performer_id
        and p.user_id = (select auth.uid())
    )
  );

drop policy if exists videos_owner_update on public.videos;
create policy videos_owner_update
  on public.videos
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.performers p
      where p.id = performer_id
        and p.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.performers p
      where p.id = performer_id
        and p.user_id = (select auth.uid())
    )
  );

drop policy if exists videos_owner_delete on public.videos;
create policy videos_owner_delete
  on public.videos
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.performers p
      where p.id = performer_id
        and p.user_id = (select auth.uid())
    )
  );

drop policy if exists gigs_owner_insert on public.gigs;
create policy gigs_owner_insert
  on public.gigs
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.performers p
      where p.id = performer_id
        and p.user_id = (select auth.uid())
    )
  );

drop policy if exists gigs_owner_update on public.gigs;
create policy gigs_owner_update
  on public.gigs
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.performers p
      where p.id = performer_id
        and p.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.performers p
      where p.id = performer_id
        and p.user_id = (select auth.uid())
    )
  );

drop policy if exists gigs_owner_delete on public.gigs;
create policy gigs_owner_delete
  on public.gigs
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.performers p
      where p.id = performer_id
        and p.user_id = (select auth.uid())
    )
  );

drop policy if exists booking_requests_owner_select on public.booking_requests;
create policy booking_requests_owner_select
  on public.booking_requests
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.performers p
      where p.id = performer_id
        and p.user_id = (select auth.uid())
    )
  );
