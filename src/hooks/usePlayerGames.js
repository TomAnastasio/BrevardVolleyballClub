import { useCallback, useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";
import { TOURNAMENT_MATCH_EMBED, tournamentTagFor } from "../lib/tournamentGameTag.js";

// Which side of a game a given player was on. 2v2 beach's submitter (a1)
// never gets a game_players row of their own (see migration
// 20261001191519_add_game_participants.sql) — identified via games.user_id
// instead, always team 'a'. Squad beach (3v3/4v4, migration 20261004150000)
// has no such implicit slot — like indoor, every player including the
// submitter gets an explicit game_players row — so the games.user_id
// fallback below must only apply to 2v2 beach (team_size null), not squad
// beach, or a submitter who merely logged the game (and wasn't playing, or
// was on team 'b') would be wrongly credited with a team-'a' appearance.
export function sideForPlayer(game, playerId, gpByGameId) {
  const link = (gpByGameId.get(game.id) || []).find((gp) => gp.user_id === playerId);
  if (link) {
    if (link.team) return link.team;
    if (link.slot) return link.slot.startsWith("a") ? "a" : "b";
  }
  if (game.format === "beach" && game.team_size == null && game.user_id === playerId) return "a";
  return null;
}

// Every other linked player in the game, split into the player's teammates
// and opponents. `gpByGameId` holds each game's full game_players list (with
// `profiles`); 2v2 beach's A1 comes from games.user_id, its profile from
// `profilesById`. Typed-in names have no profile, so they aren't counted.
function peopleInGame(game, playerId, side, gpByGameId, profilesById) {
  const people = new Map();
  for (const gp of gpByGameId.get(game.id) || []) {
    const gpSide = sideForPlayer(game, gp.user_id, gpByGameId);
    if (gp.user_id !== playerId && gpSide) people.set(gp.user_id, { side: gpSide, profile: gp.profiles });
  }
  if (game.format === "beach" && game.team_size == null && game.user_id && game.user_id !== playerId) {
    people.set(game.user_id, { side: "a", profile: profilesById[game.user_id] });
  }
  const teammates = [];
  const opponents = [];
  for (const [id, { side: s, profile }] of people) {
    const person = { id, name: profile?.display_name || "Player", avatarUrl: profile?.avatar_url || null };
    (s === side ? teammates : opponents).push(person);
  }
  return { teammates, opponents };
}

export function mapGameForPlayer(game, playerId, gpByGameId, profilesById = {}) {
  const side = sideForPlayer(game, playerId, gpByGameId);
  if (!side) return null;
  return {
    ...peopleInGame(game, playerId, side, gpByGameId, profilesById),
    id: game.id,
    date: game.played_date,
    mode: game.mode,
    format: game.format,
    teamSize: game.team_size ?? null,
    tournament: tournamentTagFor(game),
    ownScore: side === "a" ? game.score_a : game.score_b,
    oppScore: side === "a" ? game.score_b : game.score_a,
    oppName: side === "a" ? game.name_b : game.name_a,
    createdAt: game.created_at,
  };
}

// Profile records: every game, and ranked games only. There are no seasons
// yet, so "ranked" is every ranked game ever (owner's call, 2026-10-22: this
// is season 1; seasons come later).
export function winLossRecords(games) {
  const tally = (list) => ({
    wins: list.filter((g) => g.ownScore > g.oppScore).length,
    losses: list.filter((g) => g.ownScore < g.oppScore).length,
  });
  return { overall: tally(games), ranked: tally(games.filter((g) => g.mode === "ranked")) };
}

// Minimum games together (or against) before someone can be "best partner"
// or "toughest opponent" (owner's call, 2026-10-22).
export const PARTNER_MIN_GAMES = 3;

// Partners & rivals from a player's mapped games (all games, ranked and
// casual, beach and indoor; owner's call, 2026-10-22):
// - mostFrequentPartner: most games on the same team (ties: more wins)
// - bestPartner: highest win rate together, min PARTNER_MIN_GAMES (ties: more games)
// - toughestOpponent: lowest win rate against, min PARTNER_MIN_GAMES, and
//   only someone they've actually lost to (ties: more games)
// Each is `{ player, games, wins, losses }` or null.
export function partnerStats(games) {
  const partners = new Map();
  const opponents = new Map();
  const add = (map, person, won) => {
    const entry = map.get(person.id) || { player: person, games: 0, wins: 0, losses: 0 };
    entry.games += 1;
    if (won) entry.wins += 1;
    else entry.losses += 1;
    map.set(person.id, entry);
  };
  for (const g of games) {
    if (g.ownScore === g.oppScore) continue;
    const won = g.ownScore > g.oppScore;
    for (const p of g.teammates || []) add(partners, p, won);
    for (const p of g.opponents || []) add(opponents, p, won);
  }
  const rate = (e) => e.wins / e.games;
  const pick = (list, better) => list.reduce((best, e) => (best === null || better(e, best) ? e : best), null);
  const partnerList = [...partners.values()];
  const eligibleOpponents = [...opponents.values()].filter((e) => e.games >= PARTNER_MIN_GAMES && e.losses > 0);
  return {
    mostFrequentPartner: pick(partnerList, (e, b) => e.games > b.games || (e.games === b.games && e.wins > b.wins)),
    bestPartner: pick(
      partnerList.filter((e) => e.games >= PARTNER_MIN_GAMES),
      (e, b) => rate(e) > rate(b) || (rate(e) === rate(b) && e.games > b.games),
    ),
    toughestOpponent: pick(
      eligibleOpponents,
      (e, b) => rate(e) < rate(b) || (rate(e) === rate(b) && e.games > b.games),
    ),
  };
}

// Every game a given player has been a part of — beach or indoor, submitted
// by them or linked as a participant — newest first. `games`/`game_players`
// are both fully public (migrations 20261002151652/20261002204815), so this
// works for any player, not just the signed-in user, and needs no auth.
// `refreshKey` changing (e.g. after an admin edits or deletes a game) refetches.
// `error` means the fetch failed (not "no games"); `retry` tries again.
export function usePlayerGames(playerId, refreshKey) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(Boolean(playerId));
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!playerId || !isSupabaseConfigured) {
      setGames([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(false);

    (async () => {
      try {
        const { data: links, error: linksError } = await supabase
          .from("game_players")
          .select("game_id, team, slot")
          .eq("user_id", playerId);
        if (linksError) throw linksError;

        const linkedGameIds = (links || []).map((l) => l.game_id);

        const filters = [`user_id.eq.${playerId}`];
        if (linkedGameIds.length > 0) filters.push(`id.in.(${linkedGameIds.join(",")})`);

        // Each game's full roster comes along too, for partners & rivals.
        const { data: rows, error: gamesError } = await supabase
          .from("games")
          .select(`*, game_players(user_id, slot, team, profiles(id, display_name, avatar_url)), ${TOURNAMENT_MATCH_EMBED}`)
          .or(filters.join(","))
          .order("created_at", { ascending: false });
        if (gamesError) throw gamesError;

        const gpByGameId = new Map((rows || []).map((row) => [row.id, row.game_players || []]));

        // 2v2 beach's A1 is games.user_id, not a game_players row, so their
        // profile needs its own lookup (one query, like Past Games does).
        const a1Ids = [
          ...new Set(
            (rows || [])
              .filter((r) => r.format === "beach" && r.team_size == null && r.user_id && r.user_id !== playerId)
              .map((r) => r.user_id),
          ),
        ];
        let profilesById = {};
        if (a1Ids.length > 0) {
          const { data: a1Profiles, error: a1Error } = await supabase
            .from("profiles")
            .select("id, display_name, avatar_url")
            .in("id", a1Ids);
          if (a1Error) throw a1Error;
          profilesById = Object.fromEntries((a1Profiles || []).map((p) => [p.id, p]));
        }
        if (cancelled) return;

        const mapped = (rows || [])
          .map((row) => mapGameForPlayer(row, playerId, gpByGameId, profilesById))
          .filter(Boolean);
        setGames(mapped);
      } catch (e) {
        console.error("Failed to fetch player game history from Supabase:", e);
        if (!cancelled) {
          setGames([]);
          setError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [playerId, refreshKey, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { games, loading, error, retry };
}
