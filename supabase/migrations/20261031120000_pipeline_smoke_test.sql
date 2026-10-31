-- Pipeline smoke test (2026-10-31): a deliberate no-op, committed only to
-- confirm that pushing to main still auto-applies migrations to both
-- production (apply-migrations.yml) and staging
-- (apply-migrations-staging.yml). Touches no schema and no data.
select 1;
