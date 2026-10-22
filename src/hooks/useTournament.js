import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";
import { computeStandings, rankStandings } from "../lib/queenOfCourt.js";

// A match counts as "live" on the public page if someone has been keeping
// score on it recently.
const LIVE_WINDOW_MS = 10 * 60 * 1000;

function mapMatch(row, now) {
  const scored = Boolean(row.game);
  const recentlyUpdated = row.live_updated_at && now - new Date(row.live_updated_at).getTime() < LIVE_WINDOW_MS;
  return {
    id: row.id,
    divisionId: row.division_id,
    poolId: row.pool_id,
    stage: row.stage,
    round: row.round,
    sequence: row.sequence,
    a1: row.a1,
    a2: row.a2,
    b1: row.b1,
    b2: row.b2,
    gameId: row.game_id,
    scoreA: scored ? row.game.score_a : null,
    scoreB: scored ? row.game.score_b : null,
    liveA: row.live_score_a,
    liveB: row.live_score_b,
    status: scored ? "final" : recentlyUpdated && row.live_score_a + row.live_score_b > 0 ? "live" : "upcoming",
  };
}

// Shapes the flat tables into what every tournament screen needs: divisions
// -> pools (players, ordered games, ranked standings) and finals. Standings
// are always derived from the scored games here, never stored.
export function buildTournamentModel({ tournament, divisions, entrants, pools, poolPlayers, matches, profiles }, now = Date.now()) {
  const profilesById = new Map(profiles.map((p) => [p.id, p]));
  const entrantsById = new Map(entrants.map((e) => [e.id, e]));
  const mappedMatches = matches.map((m) => mapMatch(m, now));

  const divisionModels = [...divisions]
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
    .map((division) => {
      const divisionEntrants = entrants
        .filter((e) => e.division_id === division.id)
        .sort((a, b) => (profilesById.get(a.profile_id)?.display_name || "").localeCompare(profilesById.get(b.profile_id)?.display_name || ""));
      const divisionPools = pools
        .filter((p) => p.division_id === division.id)
        .sort((a, b) => a.round - b.round || a.label.localeCompare(b.label))
        .map((pool) => {
          const players = poolPlayers
            .filter((pp) => pp.pool_id === pool.id)
            .sort((a, b) => (a.seed ?? 0) - (b.seed ?? 0))
            .map((pp) => entrantsById.get(pp.entrant_id))
            .filter(Boolean);
          const poolMatches = mappedMatches.filter((m) => m.poolId === pool.id).sort((a, b) => a.sequence - b.sequence);
          const standings = rankStandings(
            computeStandings(
              players.map((e) => e.profile_id),
              poolMatches,
            ),
          );
          return {
            ...pool,
            players,
            matches: poolMatches,
            standings,
            nextMatchId: poolMatches.find((m) => m.status !== "final")?.id ?? null,
          };
        });
      const finals = mappedMatches
        .filter((m) => m.divisionId === division.id && m.stage === "final")
        .sort((a, b) => a.sequence - b.sequence);
      return { ...division, entrants: divisionEntrants, pools: divisionPools, finals };
    });

  return { tournament, divisions: divisionModels, profilesById, matches: mappedMatches };
}

export async function fetchTournament(id) {
  const [t, divisions, entrants, pools, poolPlayers, matches] = await Promise.all([
    supabase.from("tournaments").select("*").eq("id", id).maybeSingle(),
    supabase.from("tournament_divisions").select("*").eq("tournament_id", id),
    supabase.from("tournament_entrants").select("*").eq("tournament_id", id),
    supabase.from("tournament_pools").select("*").eq("tournament_id", id),
    supabase
      .from("tournament_pool_players")
      .select("pool_id, entrant_id, seed, tournament_pools!inner(tournament_id)")
      .eq("tournament_pools.tournament_id", id),
    supabase.from("tournament_matches").select("*, game:games(score_a, score_b)").eq("tournament_id", id),
  ]);
  for (const r of [t, divisions, entrants, pools, poolPlayers, matches]) {
    if (r.error) throw r.error;
  }
  if (!t.data) return null;

  // Finals partners may not be entrants, so load every profile referenced
  // anywhere in the tournament.
  const ids = new Set(entrants.data.map((e) => e.profile_id));
  for (const m of matches.data) [m.a1, m.a2, m.b1, m.b2].forEach((pid) => ids.add(pid));
  let profiles = [];
  if (ids.size) {
    const res = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url, elo_rating, elo_games_played, is_manual")
      .in("id", [...ids]);
    if (res.error) throw res.error;
    profiles = res.data;
  }

  return buildTournamentModel({
    tournament: t.data,
    divisions: divisions.data,
    entrants: entrants.data,
    pools: pools.data,
    poolPlayers: poolPlayers.data,
    matches: matches.data,
    profiles,
  });
}

// Loads one tournament, optionally re-polling so the public page and score
// lists stay current on game day without a manual refresh.
export function useTournament(id, { pollMs = 0 } = {}) {
  const [model, setModel] = useState(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState("");
  const requestRef = useRef(0);

  const reload = useCallback(async () => {
    if (!id || !isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    const request = ++requestRef.current;
    try {
      const next = await fetchTournament(id);
      if (request !== requestRef.current) return;
      setModel(next);
      setError(next ? "" : "This tournament isn't available.");
    } catch (e) {
      console.error("Failed to load tournament:", e);
      if (request === requestRef.current) setError("Couldn't load this tournament. Check your connection and try again.");
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    reload();
  }, [reload]);

  useEffect(() => {
    if (!pollMs) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") reload();
    }, pollMs);
    return () => clearInterval(timer);
  }, [pollMs, reload]);

  return { model, loading, error, reload };
}

export function useTournamentList() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    supabase
      .from("tournaments")
      .select("*")
      .order("event_date", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.error("Failed to load tournaments:", error);
        setTournaments(data || []);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [version]);

  return { tournaments, loading, reload: () => setVersion((v) => v + 1) };
}

// A player's tournament history for their profile page. Drafts are hidden
// by RLS, so this only ever shows published tournaments.
export function usePlayerTournaments(profileId) {
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    if (!profileId || !isSupabaseConfigured) return;
    let cancelled = false;
    supabase
      .from("tournament_entrants")
      .select("id, final_place, title, division:tournament_divisions(name), tournament:tournaments(id, name, event_date, status)")
      .eq("profile_id", profileId)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.error("Failed to load player tournaments:", error);
        setEntries(
          (data || [])
            .filter((e) => e.tournament)
            .sort((a, b) => b.tournament.event_date.localeCompare(a.tournament.event_date)),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  return entries;
}
