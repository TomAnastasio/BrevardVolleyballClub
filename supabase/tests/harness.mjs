// Throwaway Postgres (PGlite) with just enough of Supabase stubbed in to run
// every migration in supabase/migrations, oldest first.
import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

export const STUB = `
create role anon nologin; create role authenticated nologin; create role service_role nologin;
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb not null default '{}');
create table auth.identities (id uuid primary key default gen_random_uuid(), user_id uuid, provider text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create function auth.role() returns text language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon') $$;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim', true), ''), nullif(current_setting('request.jwt.claims', true), ''))::jsonb $$;
create schema storage;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid);
create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name, '/') $$;
alter table storage.objects enable row level security;
grant usage on schema public, auth, storage to anon, authenticated;
grant execute on all functions in schema auth to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
alter default privileges in schema public grant execute on functions to anon, authenticated;
`;

export async function freshDb({ upTo = Infinity, extra = [] } = {}) {
  const db = new PGlite();
  await db.exec(STUB);
  const dir = fileURLToPath(new URL("../migrations", import.meta.url));
  const files = [...fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort(), ...extra];
  for (const f of files) {
    if (f.slice(0, 14) > String(upTo)) break;
    const sql = fs.readFileSync(path.isAbsolute(f) ? f : path.join(dir, f), "utf8");
    try { await db.exec(sql); } catch (e) { throw new Error(`${path.basename(f)}: ${e.message}`); }
  }
  return db;
}

if (process.argv[1].endsWith("harness.mjs")) {
  const db = await freshDb();
  const r = await db.query("select count(*)::int n from pg_tables where schemaname = 'public'");
  console.log("all migrations applied; public tables:", r.rows[0].n);
}
