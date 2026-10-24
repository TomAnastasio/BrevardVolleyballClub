# Database scenario tests

Runs every migration in `supabase/migrations` (from a checkout of `main` at
`/workspace`) in a throwaway Postgres (PGlite), then scenario-tests tokens,
pulls and outfits.

    npm i @electric-sql/pglite@0.3.8
    node assemble.mjs migration-template.sql ../source/catalog.json OUT.sql
    ODDS_N=20000 node tokens.test.mjs OUT.sql

`migration-template.sql` + the catalog is how
`20261024200000_tokens_items_and_pulls.sql` was made; the catalog comes from
`node ../source/catalog.mjs > ../source/catalog.json`.

Now that the tokens migration is on `main`, run the tests against the
migrations folder as-is: `echo 'select 1;' > empty.sql && node tokens.test.mjs empty.sql`
and `node look.test.mjs` (avatar and skin color, migration 20261024230000).
