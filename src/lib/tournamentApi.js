import { supabase } from "./supabaseClient.js";
import { buildPoolSchedule, poolLabel, poolRules } from "./queenOfCourt.js";

// Every tournament write the app makes. Admin-only writes are plain table
// writes gated by RLS (migration 20261022180000); score entry goes through
// the two security-definer RPCs, since any signed-in user may enter scores.

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

// Imports confirmed roster rows: creates manual profiles for new players,
// enters everyone, and stores contact info in the admin-only table. Runs
// row by row (a roster is tens of players) so one bad row doesn't sink the
// rest; returns per-row failures for the screen to show.
export async function importEntrants(tournamentId, rows) {
  const failures = [];
  let added = 0;
  for (const row of rows) {
    try {
      let profileId = row.profileId;
      if (!profileId) {
        const profile = unwrap(
          await supabase
            .from("profiles")
            .insert({ display_name: row.name.slice(0, 24), is_manual: true })
            .select("id")
            .single(),
        );
        profileId = profile.id;
      }
      const entrant = unwrap(
        await supabase
          .from("tournament_entrants")
          .insert({
            tournament_id: tournamentId,
            division_id: row.divisionId,
            profile_id: profileId,
            avp_rank: row.avpRank ?? null,
            truvolley_score: row.truvolley ?? null,
            is_junior: Boolean(row.junior),
          })
          .select("id")
          .single(),
      );
      if (row.email || row.phone) {
        unwrap(
          await supabase
            .from("tournament_entrant_contacts")
            .insert({ entrant_id: entrant.id, email: row.email || null, phone: row.phone || null }),
        );
      }
      added++;
    } catch (e) {
      console.error("Failed to import roster row:", row.name, e);
      failures.push({ name: row.name, reason: friendlyError(e, "Couldn't add this player.") });
    }
  }
  return { added, failures };
}

export async function updateEntrant(id, fields) {
  unwrap(await supabase.from("tournament_entrants").update(fields).eq("id", id));
}

export async function removeEntrant(id) {
  unwrap(await supabase.from("tournament_entrants").delete().eq("id", id));
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
