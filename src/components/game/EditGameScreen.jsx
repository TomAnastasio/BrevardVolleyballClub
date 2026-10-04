import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import { useAuth } from "../../hooks/useAuth.js";
import { mapTeamPlayers } from "../../hooks/useGameHistory.js";
import NewGameForm from "./NewGameForm.jsx";

// Thin data/save wrapper around NewGameForm's `editing` mode: fetches the
// target game's current roster, builds the `initialGame` shape NewGameForm
// expects, and turns its onSave payload into a call to one of the two
// admin-only RPCs (migration 20261003120000). The real authorization gate is
// server-side (those RPCs raise if the caller isn't an admin) — the isAdmin
// check here is just defense in depth / a friendlier message, since the only
// way to reach this screen is already admin-gated (HistoryView's edit
// affordance only renders for admins).
export default function EditGameScreen({ gameId, onSaved }) {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [game, setGame] = useState(null);
  const [initialGame, setInitialGame] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError("");

    async function load() {
      try {
        const { data: row, error } = await supabase
          .from("games")
          .select("id, user_id, format, game_players(user_id, slot, team, profiles(id, display_name, avatar_url))")
          .eq("id", gameId)
          .single();
        if (error) throw error;
        if (!active) return;

        if (row.format === "indoor") {
          setGame({ format: "indoor" });
          setInitialGame({
            teamAPlayers: mapTeamPlayers(row.game_players, "a"),
            teamBPlayers: mapTeamPlayers(row.game_players, "b"),
          });
        } else {
          const { data: a1Profile, error: a1Error } = await supabase
            .from("profiles")
            .select("id, display_name, avatar_url")
            .eq("id", row.user_id)
            .single();
          if (a1Error) throw a1Error;
          if (!active) return;

          const bySlot = (slot) => {
            const link = (row.game_players || []).find((gp) => gp.slot === slot);
            if (!link) return null;
            return {
              userId: link.user_id,
              name: link.profiles?.display_name || "",
              avatarUrl: link.profiles?.avatar_url || null,
            };
          };

          setGame({ format: "beach" });
          setInitialGame({
            a1: { userId: a1Profile.id, name: a1Profile.display_name, avatarUrl: a1Profile.avatar_url },
            a2: bySlot("a2"),
            b1: bySlot("b1"),
            b2: bySlot("b2"),
          });
        }
      } catch (e) {
        console.error("Failed to load game for editing:", e);
        if (active) setLoadError("Couldn't load this game. Please try again.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [gameId]);

  async function handleSave(payload) {
    if (saving) return;
    setSaving(true);
    setSaveError("");
    try {
      const { error } =
        payload.format === "indoor"
          ? await supabase.rpc("admin_update_indoor_game_players", {
              p_game_id: gameId,
              p_team_a: payload.teamAPlayers.map((p) => p.id),
              p_team_b: payload.teamBPlayers.map((p) => p.id),
            })
          : await supabase.rpc("admin_update_beach_game_players", {
              p_game_id: gameId,
              p_a1_user_id: payload.a1,
              p_a2_user_id: payload.a2,
              p_b1_user_id: payload.b1,
              p_b2_user_id: payload.b2,
            });
      if (error) throw error;
      setSaving(false);
      onSaved();
    } catch (e) {
      console.error("Failed to save game edits:", e);
      setSaveError("Couldn't save changes. Please try again.");
      setSaving(false);
    }
  }

  if (!isAdmin) {
    return <p className="p-6 text-center text-muted">Admin access required.</p>;
  }
  if (loading) {
    return <p className="p-6 text-center text-muted">Loading game…</p>;
  }
  if (loadError || !game) {
    return <p className="p-6 text-center text-red-400">{loadError || "Game not found."}</p>;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {saveError && (
        <p role="alert" className="flex-none px-3 pt-2 text-center text-sm font-semibold text-red-400">
          {saveError}
        </p>
      )}
      {saving && <p className="flex-none px-3 pt-2 text-center text-sm text-muted">Saving…</p>}
      <NewGameForm format={game.format} editing initialGame={initialGame} onSave={handleSave} />
    </div>
  );
}
