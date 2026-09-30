import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

const OWNER_A = "11111111-1111-4111-8111-111111111111";
const OWNER_B = "22222222-2222-4222-8222-222222222222";
const OWNER_C = "33333333-3333-4333-8333-333333333333";

const migrationsDir = path.join(process.cwd(), "supabase/migrations");

async function applyMigrations(db: PGlite) {
  await db.exec(`
    create role anon nologin noinherit;
    create role authenticated nologin noinherit;
    create role service_role nologin noinherit bypassrls;
    grant anon to current_user;
    grant authenticated to current_user;
    grant service_role to current_user;

    create schema if not exists auth;
    create table if not exists auth.users (id uuid primary key);
    create or replace function auth.uid()
    returns uuid
    language sql
    stable
    as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;
    grant usage on schema auth to anon, authenticated, service_role, public;
    grant execute on function auth.uid() to anon, authenticated, service_role, public;

    create schema if not exists storage;
    create table if not exists storage.buckets (
      id text primary key,
      name text not null,
      public boolean not null default false,
      file_size_limit bigint,
      allowed_mime_types text[]
    );
    create table if not exists storage.objects (
      id bigint generated always as identity primary key,
      bucket_id text,
      name text
    );
    alter table storage.objects enable row level security;
  `);

  const files = readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();
  for (const file of files) {
    const sql = readFileSync(path.join(migrationsDir, file), "utf8");
    await db.exec(sql);
  }
}

async function seed(db: PGlite) {
  await db.exec(`
    insert into auth.users (id) values ('${OWNER_A}'), ('${OWNER_B}'), ('${OWNER_C}');
    insert into public.performers (id, name, category, city, user_id) values
      ('owner-a', 'Owner A', 'band', 'Austin, TX', '${OWNER_A}'),
      ('owner-b', 'Owner B', 'dj', 'Austin, TX', '${OWNER_B}'),
      ('demo-act', 'Demo Act', 'solo', 'Austin, TX', null);
    insert into public.videos (id, performer_id, title, source_type, url) values
      ('clip-a', 'owner-a', 'Clip A', 'url', 'https://example.com/a.mp4'),
      ('clip-demo', 'demo-act', 'Demo clip', 'url', 'https://example.com/d.mp4');
    insert into public.gigs (
      id, performer_id, title, description, category, datetime, lat, lng, label
    ) values
      ('gig-a', 'owner-a', 'Show A', '', 'band', now(), 30.27, -97.74, 'Venue A'),
      ('gig-demo', 'demo-act', 'Demo show', '', 'solo', now(), 30.27, -97.74, 'Venue D');
    insert into public.booking_requests (
      id, performer_id, contact_name, contact_email, event_details,
      preferred_date, preferred_location, message
    ) values
      ('book-a', 'owner-a', 'Fan', 'fan@example.com', 'Party', '2026-10-10', 'Home', ''),
      ('book-b', 'owner-b', 'Other', 'other@example.com', 'Party', '2026-10-11', 'Hall', ''),
      ('book-demo', 'demo-act', 'Fan', 'fan@example.com', 'Party', '2026-10-12', 'Park', '');
  `);
}

type Queryable = {
  query: <T extends Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<{ rows: T[]; rowCount?: number | null }>;
};

async function asRole<T>(
  db: PGlite,
  role: "anon" | "authenticated" | "service_role",
  uid: string | null,
  run: (tx: Queryable) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [uid ?? ""]);
    await tx.query(`set local role ${role}`);
    return run(tx);
  });
}

async function expectDenied(
  db: PGlite,
  role: "anon" | "authenticated" | "service_role",
  uid: string | null,
  sql: string,
  params: unknown[] = [],
) {
  await assert.rejects(
    () => asRole(db, role, uid, (tx) => tx.query(sql, params)),
    (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      assert.match(message, /42501|row-level security|permission denied/i);
      return true;
    },
  );
}

test("RLS lets an owner edit their rows and blocks everyone else", { timeout: 60_000 }, async () => {
  const db = new PGlite();
  try {
    await applyMigrations(db);
    await seed(db);

    const grants = await db.query<{ grantee: string; table_name: string; privilege_type: string }>(`
      select grantee, table_name, privilege_type
      from information_schema.role_table_grants
      where table_schema = 'public'
        and table_name in ('performers', 'videos', 'gigs', 'booking_requests')
        and grantee in ('anon', 'authenticated', 'PUBLIC')
    `);
    const grantKey = (row: { grantee: string; table_name: string; privilege_type: string }) =>
      `${row.grantee}:${row.table_name}:${row.privilege_type}`;
    const granted = new Set(grants.rows.map(grantKey));
    for (const table of ["performers", "videos", "gigs"]) {
      assert.equal(granted.has(`anon:${table}:SELECT`), true, `anon select ${table}`);
      assert.equal(granted.has(`anon:${table}:INSERT`), false, `anon insert ${table}`);
      assert.equal(granted.has(`anon:${table}:UPDATE`), false, `anon update ${table}`);
      assert.equal(granted.has(`anon:${table}:DELETE`), false, `anon delete ${table}`);
    }
    assert.equal(granted.has("anon:booking_requests:SELECT"), false);
    assert.equal(granted.has("anon:booking_requests:INSERT"), false);
    assert.equal(granted.has("authenticated:booking_requests:SELECT"), true);
    assert.equal(granted.has("authenticated:booking_requests:INSERT"), false);
    assert.equal(granted.has("authenticated:performers:INSERT"), true);
    assert.equal(granted.has("authenticated:videos:DELETE"), true);
    assert.equal(granted.has("authenticated:gigs:UPDATE"), true);

    const publicRows = await asRole(db, "anon", null, (tx) =>
      tx.query<{ id: string }>("select id from public.performers order by id"),
    );
    assert.deepEqual(
      publicRows.rows.map((row) => row.id),
      ["demo-act", "owner-a", "owner-b"],
    );

    await expectDenied(
      db,
      "anon",
      null,
      "insert into public.performers (id, name, category, city, user_id) values ('anon-act', 'Anon', 'solo', 'Austin, TX', null)",
    );
    await expectDenied(
      db,
      "authenticated",
      OWNER_A,
      "insert into public.performers (id, name, category, city, user_id) values ('stolen', 'Stolen', 'solo', 'Austin, TX', $1)",
      [OWNER_B],
    );
    await expectDenied(
      db,
      "authenticated",
      OWNER_A,
      "insert into public.performers (id, name, category, city) values ('unclaimed-new', 'Nope', 'solo', 'Austin, TX')",
    );

    const created = await asRole(db, "authenticated", OWNER_C, (tx) =>
      tx.query(
        "insert into public.performers (id, name, category, city, user_id) values ('owner-c', 'Owner C', 'solo', 'Austin, TX', $1) returning id",
        [OWNER_C],
      ),
    );
    assert.equal(created.rows[0]?.id, "owner-c");
    await assert.rejects(
      () =>
        asRole(db, "authenticated", OWNER_A, (tx) =>
          tx.query(
            "insert into public.performers (id, name, category, city, user_id) values ('second-a', 'Second', 'solo', 'Austin, TX', $1)",
            [OWNER_A],
          ),
        ),
      (error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        assert.match(message, /23505|duplicate key|performers_user_id_key/i);
        return true;
      },
    );

    const renamed = await asRole(db, "authenticated", OWNER_A, (tx) =>
      tx.query("update public.performers set name = 'Owner A renamed' where id = 'owner-a'"),
    );
    assert.equal(renamed.rowCount, 1);
    const missed = await asRole(db, "authenticated", OWNER_B, (tx) =>
      tx.query("update public.performers set name = 'hacked' where id = 'owner-a'"),
    );
    assert.equal(missed.rowCount, 0);
    const demoUpdate = await asRole(db, "authenticated", OWNER_A, (tx) =>
      tx.query("update public.performers set name = 'claimed demo' where id = 'demo-act'"),
    );
    assert.equal(demoUpdate.rowCount, 0);
    const still = await db.query<{ name: string }>("select name from public.performers where id = 'owner-a'");
    assert.equal(still.rows[0]?.name, "Owner A renamed");
    const demo = await db.query<{ name: string }>("select name from public.performers where id = 'demo-act'");
    assert.equal(demo.rows[0]?.name, "Demo Act");

    const edited = await asRole(db, "authenticated", OWNER_A, (tx) =>
      tx.query(
        "update public.performers set name = 'Owner A edited', category = 'solo', bio = 'edited bio', genres = '{folk,jazz}' where id = 'owner-a'",
      ),
    );
    assert.equal(edited.rowCount, 1);
    const otherProfile = await asRole(db, "authenticated", OWNER_B, (tx) =>
      tx.query(
        "update public.performers set name = 'hacked', category = 'dj', bio = 'hacked', genres = '{nope}', id = 'stolen-slug', user_id = $1 where id = 'owner-a'",
        [OWNER_B],
      ),
    );
    assert.equal(otherProfile.rowCount, 0);
    const owned = await db.query<{
      id: string;
      name: string;
      category: string;
      bio: string;
      genres: string[];
      user_id: string;
    }>("select id, name, category, bio, genres, user_id from public.performers where id = 'owner-a'");
    assert.equal(owned.rows[0]?.id, "owner-a");
    assert.equal(owned.rows[0]?.name, "Owner A edited");
    assert.equal(owned.rows[0]?.category, "solo");
    assert.equal(owned.rows[0]?.bio, "edited bio");
    assert.deepEqual(owned.rows[0]?.genres, ["folk", "jazz"]);
    assert.equal(owned.rows[0]?.user_id, OWNER_A);

    await expectDenied(
      db,
      "authenticated",
      OWNER_B,
      "insert into public.gigs (id, performer_id, title, category, datetime, lat, lng, label) values ('gig-x', 'owner-a', 'X', 'band', now(), 1, 2, 'Here')",
    );
    await expectDenied(
      db,
      "authenticated",
      OWNER_A,
      "insert into public.videos (id, performer_id, title, source_type, url) values ('clip-x', 'demo-act', 'X', 'url', 'https://example.com/x.mp4')",
    );
    const ownGig = await asRole(db, "authenticated", OWNER_A, (tx) =>
      tx.query(
        "insert into public.gigs (id, performer_id, title, category, datetime, lat, lng, label) values ('gig-own', 'owner-a', 'Own', 'band', now(), 1, 2, 'Here') returning id",
      ),
    );
    assert.equal(ownGig.rows[0]?.id, "gig-own");
    const deleted = await asRole(db, "authenticated", OWNER_A, (tx) =>
      tx.query("delete from public.videos where id = 'clip-a'"),
    );
    assert.equal(deleted.rowCount, 1);
    const notDeleted = await asRole(db, "authenticated", OWNER_A, (tx) =>
      tx.query("delete from public.videos where id = 'clip-demo'"),
    );
    assert.equal(notDeleted.rowCount, 0);

    const ownBookings = await asRole(db, "authenticated", OWNER_A, (tx) =>
      tx.query<{ id: string }>("select id from public.booking_requests order by id"),
    );
    assert.deepEqual(
      ownBookings.rows.map((row) => row.id),
      ["book-a"],
    );
    const otherBookings = await asRole(db, "authenticated", OWNER_B, (tx) =>
      tx.query<{ id: string }>("select id from public.booking_requests order by id"),
    );
    assert.deepEqual(
      otherBookings.rows.map((row) => row.id),
      ["book-b"],
    );
    await expectDenied(db, "anon", null, "select id from public.booking_requests");
    await expectDenied(
      db,
      "authenticated",
      OWNER_A,
      "insert into public.booking_requests (id, performer_id, contact_name, contact_email, event_details, preferred_date, preferred_location) values ('book-new', 'owner-a', 'Fan', 'fan@example.com', 'Party', '2026-10-13', 'Home')",
    );

    const serviceBookings = await asRole(db, "service_role", null, (tx) =>
      tx.query<{ id: string }>("select id from public.booking_requests order by id"),
    );
    assert.deepEqual(
      serviceBookings.rows.map((row) => row.id),
      ["book-a", "book-b", "book-demo"],
    );

    await db.exec(
      `insert into public.performers (id, name, category, city) values ('demo-two', 'Demo Two', 'dj', 'Austin, TX')`,
    );
    const nullOwners = await db.query<{ n: number }>(
      "select count(*)::int as n from public.performers where user_id is null",
    );
    assert.ok((nullOwners.rows[0]?.n ?? 0) >= 2);

    const visibleToOwner = await asRole(db, "authenticated", OWNER_A, (tx) =>
      tx.query<{ id: string }>("select id from public.performers where user_id = $1", [OWNER_A]),
    );
    assert.deepEqual(
      visibleToOwner.rows.map((row) => row.id).sort(),
      ["owner-a"],
    );

    await db.exec(`delete from auth.users where id = '${OWNER_B}'`);
    const unclaimed = await db.query<{ user_id: string | null }>(
      "select user_id from public.performers where id = 'owner-b'",
    );
    assert.equal(unclaimed.rows[0]?.user_id, null);

    const anonPolicies = await db.query<{ polname: string }>(`
      select pol.polname
      from pg_policy pol
      join pg_class cls on cls.oid = pol.polrelid
      join pg_namespace nsp on nsp.oid = cls.relnamespace
      where nsp.nspname = 'storage'
        and cls.relname = 'objects'
        and pol.polname in ('clips_anon_insert', 'clips_public_insert')
    `);
    assert.equal(anonPolicies.rows.length, 0);
  } finally {
    await db.close();
  }
});
