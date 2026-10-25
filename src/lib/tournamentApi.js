import { supabase } from "./supabaseClient.js";
import { buildPoolSchedule, poolLabel, poolRules } from "./queenOfCourt.js";

// Every tournament write the app makes. Most admin-only writes are plain
// table writes gated by RLS (migration 20261022180000); importing players
// and removing one are admin RPCs so each is all-or-nothing (migration
// 20261025050000). Score entry goes through the two security-definer RPCs,
// since any signed-in user may enter scores.

function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}

export function friendlyError(e, fallback = "Something went wrong. Please try again.") {
  const msg = e?.message || "";
  // Messages raised on purpose by the migration's functions/triggers are
  // already written for people; anything else gets the generic fallback.
  const known = [
    "already has a score",
    "sign in to enter scores",
    "scores must be between",
    "can't end in a tie",
    "only be entered while the tournament is running",
    "delete its game first",
    "tournament game not found",
    "isn't in this tournament",
    "has started since you opened this screen",
    "doesn't match the pool's players",
    "several players are named",
    "pick a division for",
    "every new player needs a name",
    "player not found",
  ];
  if (known.some((k) => msg.includes(k))) return msg.charAt(0).toUpperCase() + msg.slice(1) + ".";
  if (msg.includes("duplicate key") && msg.includes("tournament_entrants")) return "That player is already entered.";
  return fallback;
}

export async function createTournament({ divisions, ...fields }, userId) {
  const tournament = unwrap(
    await supabase
      .from("tournaments")
      .insert({ ...fields, created_by: userId })
      .select()
      .single(),
  );
  if (divisions.length) {
    unwrap(
      await supabase
        .from("tournament_divisions")
        .insert(divisions.map((name, i) => ({ tournament_id: tournament.id, name, sort_order: i }))),
    );
  }
  return tournament;
}

export async function updateTournament(id, fields) {
  return unwrap(await supabase.from("tournaments").update(fields).eq("id", id).select().single());
}

export async function deleteDraftTournament(id) {
  const rows = unwrap(await supabase.from("tournaments").delete().eq("id", id).select("id"));
  if (!rows.length) throw new Error("Only unpublished drafts can be deleted.");
}

export async function addDivision(tournamentId, name, sortOrder) {
  return unwrap(
    await supabase
      .from("tournament_divisions")
      .insert({ tournament_id: tournamentId, name, sort_order: sortOrder })
      .select()
      .single(),
  );
}

export async function deleteDivision(id) {
  unwrap(await supabase.from("tournament_divisions").delete().eq("id", id));
}

// Imports confirmed roster rows (or one walk-up player) in one database
// call: it all goes in or nothing changes, so retrying after an error is
// safe. The database reuses an existing player with the same name instead
// of creating a duplicate profile, unless the admin deliberately chose
// "New profile" over a same-name match (row.newProfile). Players already
// entered are skipped and listed in `skipped`.
// Returns { added, createdProfiles, skipped: [{ name, reason }] }.
export async function importEntrants(tournamentId, rows) {
  const result = unwrap(
    await supabase.rpc("admin_import_tournament_entrants", {
      p_tournament_id: tournamentId,
      p_rows: rows.map((row) => ({
        name: row.name,
        profile_id: row.profileId || null,
        new_profile: Boolean(row.newProfile),
        division_id: row.divisionId,
        avp_rank: row.avpRank ?? null,
        truvolley: row.truvolley ?? null,
        junior: Boolean(row.junior),
        email: row.email || null,
        phone: row.phone || null,
      })),
    }),
  );
  return { added: result.added, createdProfiles: result.created_profiles, skipped: result.skipped || [] };
}

export async function updateEntrant(id, fields) {
  unwrap(await supabase.from("tournament_entrants").update(fields).eq("id", id));
}

// Removes a player and their unscored games in one database call; pools in
// `rebuiltPools` ({ poolId: [game] }, from planEntrantRemoval in
// src/lib/tournamentRoster.js) get a fresh schedule instead. Scored games
// are kept.
export async function removeEntrant(id, rebuiltPools = {}) {
  return unwrap(
    await supabase.rpc("admin_remove_tournament_entrant", { p_entrant_id: id, p_rebuilt_pools: rebuiltPools }),
  );
}

export async function fetchContacts(entrantIds) {
  if (!entrantIds.length) return new Map();
  const rows = unwrap(
    await supabase.from("tournament_entrant_contacts").select("entrant_id, email, phone").in("entrant_id", entrantIds),
  );
  return new Map(rows.map((r) => [r.entrant_id, r]));
}

// Replaces a division's pools for one round with `pools` (arrays of
// entrants, in seed order) and writes each pool's fixed game order, with
// the game rules for that pool size. `labels` defaults to A, B, C...
// The database refuses (trigger) if any game being replaced already has a
// score. `fallbackRules` (the tournament's own) covers sizes other than 4/5.
export async function savePools({ tournamentId, divisionId, round, pools, labels = [], courts = [], fallbackRules }) {
  unwrap(
    await supabase.from("tournament_pools").delete().eq("division_id", divisionId).eq("round", round),
  );
  for (let i = 0; i < pools.length; i++) {
    const players = pools[i];
    const pool = unwrap(
      await supabase
        .from("tournament_pools")
        .insert({
          tournament_id: tournamentId,
          division_id: divisionId,
          round,
          label: labels[i] || poolLabel(i),
          court: courts[i] || null,
        })
        .select()
        .single(),
    );
    unwrap(
      await supabase
        .from("tournament_pool_players")
        .insert(players.map((e, seed) => ({ pool_id: pool.id, entrant_id: e.id, seed: seed + 1 }))),
    );
    const schedule = buildPoolSchedule(players.length);
    const pid = (index) => players[index].profile_id;
    const rules = poolRules(players.length, fallbackRules);
    unwrap(
      await supabase.from("tournament_matches").insert(
        schedule.map(([[a1, a2], [b1, b2]], n) => ({
          tournament_id: tournamentId,
          division_id: divisionId,
          pool_id: pool.id,
          stage: "pool",
          round,
          sequence: n + 1,
          a1: pid(a1),
          a2: pid(a2),
          b1: pid(b1),
          b2: pid(b2),
          win_score: rules.winScore,
          win_by_two: rules.winByTwo,
          point_cap: rules.pointCap,
        })),
      ),
    );
  }
}

export async function updatePoolCourt(poolId, court) {
  unwrap(await supabase.from("tournament_pools").update({ court: court || null }).eq("id", poolId));
}

// A final between two finalists (a1, b1) and their partners: one match
// per set, linked to the pool it's the final of, each with its set's rules.
export async function addFinal({ tournamentId, divisionId, pool, sets, a1, a2, b1, b2 }) {
  unwrap(
    await supabase.from("tournament_matches").insert(
      sets.map((rules, i) => ({
        tournament_id: tournamentId,
        division_id: divisionId,
        pool_id: pool.id,
        stage: "final",
        round: pool.round,
        sequence: i + 1,
        a1,
        a2,
        b1,
        b2,
        win_score: rules.winScore,
        win_by_two: rules.winByTwo,
        point_cap: rules.pointCap,
      })),
    ),
  );
}

export async function deleteMatch(id) {
  const rows = unwrap(await supabase.from("tournament_matches").delete().eq("id", id).select("id"));
  if (!rows.length) throw new Error("This game already has a score; delete its game first.");
}

// Records Queen/Princess for each division and marks
// the tournament done. `results` is [{ entrantId, title, place }]; everyone
// else is cleared so re-running this (e.g. to fix a mistake) never leaves a
// stale title.
export async function completeTournament(tournamentId, results) {
  unwrap(
    await supabase
      .from("tournament_entrants")
      .update({ title: null, final_place: null })
      .eq("tournament_id", tournamentId),
  );
  for (const r of results) {
    unwrap(
      await supabase
        .from("tournament_entrants")
        .update({ title: r.title, final_place: r.place })
        .eq("id", r.entrantId),
    );
  }
  await updateTournament(tournamentId, { status: "complete" });
}

export async function submitMatchScore(matchId, scoreA, scoreB) {
  return unwrap(
    await supabase.rpc("submit_tournament_match_score", {
      p_match_id: matchId,
      p_score_a: scoreA,
      p_score_b: scoreB,
    }),
  );
}

// One game's live score, so a scoring phone can follow another phone
// scoring the same game (and notice once it's been submitted).
export async function fetchLiveScore(matchId) {
  return unwrap(
    await supabase
      .from("tournament_matches")
      .select("live_score_a, live_score_b, live_updated_at, game_id")
      .eq("id", matchId)
      .maybeSingle(),
  );
}

export async function pushLiveScore(matchId, scoreA, scoreB) {
  unwrap(
    await supabase.rpc("update_tournament_match_live_score", {
      p_match_id: matchId,
      p_score_a: scoreA,
      p_score_b: scoreB,
    }),
  );
}

// Admin fix for a wrong score: deletes the recorded game via the existing
// admin_delete_game (which replays Elo), and the match's game_id goes back
// to null (ON DELETE SET NULL), so the game can simply be scored again.
export async function undoMatchScore(gameId) {
  unwrap(await supabase.rpc("admin_delete_game", { p_game_id: gameId }));
}
