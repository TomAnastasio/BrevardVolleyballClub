-- Staging wake check (2026-10-31): a deliberate no-op, committed only to
-- see whether apply-migrations-staging.yml can reach the staging project
-- after Supabase paused it for inactivity. Touches no schema and no data.
select 1;
