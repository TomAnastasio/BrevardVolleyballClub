import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";

// Which side of a game a given player was on. Beach's submitter (a1) never
// gets a game_players row of their own (see migration
// 20261001191519_add_game_participants.sql) — identified via games.user_id
// instead, always team 'a'. Every other slot (beach a2/b1/b2, or any indoor
// roster spot) has an explicit game_players row to read team/slot off.
export function sideForPlayer(game, playerId, gpByGameId) {
  const link = (gpByGameId.get(game.id) || []).find((gp) => gp.user_id === playerId);
  if (link) {
    if (link.team) return link.team;
    if (link.slot) return link.slot.startsWith("a") ? "a" : "b";
  }
  if (game.format === "beach" && game.user_id === playerId) return "a";
  return null;
}

export function mapGameForPlayer(game, playerId, gpByGameId) {
  const side = sideForPlayer(game, playerId, gpByGameId);
  if (!side) return null;
  return {
    id: game.id,
    date: game.played_date,
    mode: game.mode,
    format: game.format,
    ownScore: side === "a" ? game.score_a : game.score_b,
    oppScore: side === "a" ? game.score_b : game.score_a,
    oppName: side === "a" ? game.name_b : game.name_a,
    createdAt: game.created_at,
  };
}

// Every game a given player has been a part of — beach or indoor, submitted
// by them or linked as a participant — newest first. `games`/`game_players`
// are both fully public (migrations 20261002151652/20261002204815), so this
// works for any player, not just the signed-in user, and needs no auth.
export function usePlayerGames(playerId) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(Boolean(playerId));

  useEffect(() => {
    if (!playerId || !isSupabaseConfigured) {
      setGames([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const { data: links, error: linksError } = await supabase
          .from("game_players")
          .select("game_id, team, slot")
          .eq("user_id", playerId);
        if (linksError) throw linksError;

        const linkedGameIds = (links || []).map((l) => l.game_id);
        const gpByGameId = new Map();
        for (const link of links || []) {
          if (!gpByGameId.has(link.game_id)) gpByGameId.set(link.game_id, []);
          gpByGameId.get(link.game_id).push({ user_id: playerId, team: link.team, slot: link.slot });
        }

        const filters = [`user_id.eq.${playerId}`];
        if (linkedGameIds.length > 0) filters.push(`id.in.(${linkedGameIds.join(",")})`);

        const { data: rows, error: gamesError } = await supabase
          .from("games")
          .select("*")
          .or(filters.join(","))
          .order("created_at", { ascending: false });
        if (gamesError) throw gamesError;
        if (cancelled) return;

        const mapped = (rows || [])
          .map((row) => mapGameForPlayer(row, playerId, gpByGameId))
          .filter(Boolean);
        setGames(mapped);
      } catch (e) {
        console.error("Failed to fetch player game history from Supabase:", e);
        if (!cancelled) setGames([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [playerId]);

  return { games, loading };
}
