-- Booking accept, decline, and cancel.
--
-- Apply after 20260930183000_replace_austin_seed_with_mystic.sql.
-- Do not re-run 20260929160000_revoke_anon_table_writes.sql. That file drops
-- write policies, including the owner policies from
-- 20260930120600_performer_auth_ownership.sql and the booking policies below.
-- If it is applied again, apply the ownership migration and this file again.
--
-- Hosted rows are expected to be empty. Existing rows keep status pending,
-- gain status_changed_at from created_at, and keep a null requester_id. This
-- file does not delete booking_requests and does not set requester_id not null,
-- so a pre-existing row does not fail the migration. New inserts must name
-- the signed-in requester. A null requester_id cannot be cancelled.
--
-- authenticated may select a request they sent or a request for a performer
-- they own. They may insert only as themselves, for a claimed performer, and
-- only as pending. The performer owner may accept or decline a pending row.
-- The requester may cancel a pending row. Final statuses stay final. The
-- trigger enforces that even for the service role, which bypasses RLS.
-- anon has no privileges. This file does not touch storage.
--
-- Safe to re-run. Columns use IF NOT EXISTS, constraints and policies are
-- replaced, and the backfill only fills a null status_changed_at.

do $$
begin
  if exists (
    select 1
    from public.booking_requests
    where status not in ('pending', 'accepted', 'declined', 'cancelled')
  ) then
    raise exception 'booking_requests.status has a value this migration cannot keep. Nothing was altered.';
  end if;
end $$;

alter table public.booking_requests
  add column if not exists requester_id uuid;

alter table public.booking_requests
  add column if not exists status_changed_at timestamptz;

update public.booking_requests
set status_changed_at = created_at
where status_changed_at is null;

alter table public.booking_requests
  alter column status_changed_at set default now();

alter table public.booking_requests
  alter column status_changed_at set not null;

do $$
declare
  constraint_name text;
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_attribute a
      on a.attrelid = c.conrelid
     and a.attnum = any (c.conkey)
    where c.conrelid = 'public.booking_requests'::regclass
      and c.contype = 'f'
      and a.attname = 'requester_id'
  ) then
    alter table public.booking_requests
      add constraint booking_requests_requester_id_fkey
      foreign key (requester_id) references auth.users (id) on delete set null;
  end if;

  for constraint_name in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.booking_requests'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%status%'
  loop
    execute format(
      'alter table public.booking_requests drop constraint %I',
      constraint_name
    );
  end loop;
end $$;

alter table public.booking_requests
  add constraint booking_requests_status_check
  check (status in ('pending', 'accepted', 'declined', 'cancelled'));

create index if not exists booking_requests_requester_id_idx
  on public.booking_requests (requester_id);

comment on column public.booking_requests.requester_id is
  'auth.users id of the person who sent the request. Null only for a row that predates this column, or after that account is deleted. New inserts require it. A null requester cannot cancel.';

comment on column public.booking_requests.status is
  'pending, accepted, declined, or cancelled. New rows start pending. Only pending can change, and a final status stays final.';

comment on column public.booking_requests.status_changed_at is
  'When status was last set. Equal to created_at until the first transition.';

comment on table public.booking_requests is
  'Private. The requester and the performer owner may select a row. authenticated may insert only as themselves, for a claimed performer, starting at pending. The owner may accept or decline a pending row. The requester may cancel a pending row. anon has no privileges.';

-- SECURITY INVOKER, in public only because the trigger must live with the
-- table. EXECUTE is revoked from the Data API roles below. Not a SECURITY
-- DEFINER helper and not an RPC.
create or replace function public.booking_requests_guard()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  owner_id uuid;
begin
  if tg_op = 'INSERT' then
    if new.requester_id is null then
      raise exception 'A booking request needs a signed-in requester.'
        using errcode = '42501';
    end if;
    if (select auth.uid()) is not null
       and new.requester_id is distinct from (select auth.uid()) then
      raise exception 'You can only request a booking as yourself.'
        using errcode = '42501';
    end if;
    if new.status is distinct from 'pending' then
      raise exception 'A new booking request starts as pending.'
        using errcode = '42501';
    end if;
    new.status_changed_at := pg_catalog.now();
    return new;
  end if;

  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.performer_id is distinct from old.performer_id
     or new.contact_name is distinct from old.contact_name
     or new.contact_email is distinct from old.contact_email
     or new.event_details is distinct from old.event_details
     or new.preferred_date is distinct from old.preferred_date
     or new.preferred_location is distinct from old.preferred_location
     or new.message is distinct from old.message
     or new.created_at is distinct from old.created_at
  then
    raise exception 'Only the status of a booking request can change.'
      using errcode = '42501';
  end if;

  -- auth.users delete sets requester_id null and must not look like a status edit.
  if new.requester_id is distinct from old.requester_id then
    if new.requester_id is null and new.status is not distinct from old.status then
      return new;
    end if;
    raise exception 'Only the status of a booking request can change.'
      using errcode = '42501';
  end if;

  if new.status is not distinct from old.status then
    return new;
  end if;

  if old.status is distinct from 'pending' then
    raise exception 'Only a pending request can change.'
      using errcode = '42501';
  end if;

  if new.status in ('accepted', 'declined') then
    select p.user_id into owner_id
    from public.performers p
    where p.id = old.performer_id;
    if owner_id is null or owner_id is distinct from (select auth.uid()) then
      raise exception 'Only the performer can accept or decline a request.'
        using errcode = '42501';
    end if;
  elsif new.status = 'cancelled' then
    if old.requester_id is null or old.requester_id is distinct from (select auth.uid()) then
      raise exception 'Only the requester can cancel a request.'
        using errcode = '42501';
    end if;
  else
    raise exception 'That booking status is not allowed.'
      using errcode = '42501';
  end if;

  new.status_changed_at := pg_catalog.now();
  return new;
end;
$$;

comment on function public.booking_requests_guard() is
  'Requires a requester on insert, and allows only pending to accepted or declined by the performer owner, or pending to cancelled by the requester. Not an API.';

revoke all on function public.booking_requests_guard() from public;
revoke all on function public.booking_requests_guard() from anon, authenticated;
grant execute on function public.booking_requests_guard() to service_role;

drop trigger if exists booking_requests_guard on public.booking_requests;
create trigger booking_requests_guard
  before insert or update on public.booking_requests
  for each row
  execute function public.booking_requests_guard();

revoke all on table public.booking_requests from public, anon;
grant select, insert, update on table public.booking_requests to authenticated;

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

drop policy if exists booking_requests_requester_select on public.booking_requests;
create policy booking_requests_requester_select
  on public.booking_requests
  for select
  to authenticated
  using (requester_id = (select auth.uid()));

drop policy if exists booking_requests_requester_insert on public.booking_requests;
create policy booking_requests_requester_insert
  on public.booking_requests
  for insert
  to authenticated
  with check (
    requester_id = (select auth.uid())
    and status = 'pending'
    and exists (
      select 1
      from public.performers p
      where p.id = performer_id
        and p.user_id is not null
    )
  );

-- Permissive policies are OR-ed, so each WITH CHECK repeats its actor check.
-- A requester's cancel check does not satisfy the owner check, and the reverse.
drop policy if exists booking_requests_owner_update on public.booking_requests;
create policy booking_requests_owner_update
  on public.booking_requests
  for update
  to authenticated
  using (
    status = 'pending'
    and exists (
      select 1
      from public.performers p
      where p.id = performer_id
        and p.user_id = (select auth.uid())
    )
  )
  with check (
    status in ('accepted', 'declined')
    and exists (
      select 1
      from public.performers p
      where p.id = performer_id
        and p.user_id = (select auth.uid())
    )
  );

drop policy if exists booking_requests_requester_cancel on public.booking_requests;
create policy booking_requests_requester_cancel
  on public.booking_requests
  for update
  to authenticated
  using (
    status = 'pending'
    and requester_id = (select auth.uid())
  )
  with check (
    status = 'cancelled'
    and requester_id = (select auth.uid())
  );
