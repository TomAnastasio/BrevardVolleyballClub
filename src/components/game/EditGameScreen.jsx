import { useEffect, useState } from "react";
import { AlertDialog, Button } from "@heroui/react";
import { supabase } from "../../lib/supabaseClient.js";
import { useAuth } from "../../hooks/useAuth.js";
import { mapTeamPlayers } from "../../hooks/useGameHistory.js";
import NewGameForm from "./NewGameForm.jsx";

// Thin data/save wrapper around NewGameForm's `editing` mode: fetches the
// target game's current roster, builds the `initialGame` shape NewGameForm
// expects, and turns its onSave payload into a call to one of the three
// admin-only RPCs (migrations 20261003120000 and 20261004150000). The real
// authorization gate is server-side (those RPCs raise if the caller isn't an
// admin) — the isAdmin check here is just defense in depth / a friendlier
// message, since the only way to reach this screen is already admin-gated
// (HistoryView's edit affordance only renders for admins). Deleting (below)
// follows the same convention via admin_delete_game (migration 20261004170100).
export default function EditGameScreen({ gameId, onSaved, onDeleted }) {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [game, setGame] = useState(null);
  const [initialGame, setInitialGame] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError("");

    async function load() {
      try {
        const { data: row, error } = await supabase
          .from("games")
          .select(
            "id, user_id, format, team_size, game_players(user_id, slot, team, profiles(id, display_name, avatar_url))",
          )
          .eq("id", gameId)
          .single();
        if (error) throw error;
        if (!active) return;

        if (row.format === "indoor" || row.team_size) {
          setGame({ format: row.format, teamSize: row.team_size ?? null });
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
          : payload.teamSize
            ? await supabase.rpc("admin_update_beach_squad_game_players", {
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

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const { error } = await supabase.rpc("admin_delete_game", { p_game_id: gameId });
      if (error) throw error;
      setDeleting(false);
      onDeleted();
    } catch (e) {
      console.error("Failed to delete game:", e);
      setDeleteError("Couldn't delete this game. Please try again.");
      setDeleting(false);
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
      <NewGameForm format={game.format} teamSize={game.teamSize} editing initialGame={initialGame} onSave={handleSave} />

      <div className="flex-none p-3 pt-0">
        {deleteError && (
          <p role="alert" className="mb-2 text-center text-sm font-semibold text-red-400">
            {deleteError}
          </p>
        )}
        <AlertDialog>
          <AlertDialog.Trigger
            className="w-full rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-400 focus-visible:outline-[3px] focus-visible:outline-red-500 focus-visible:outline-offset-2"
          >
            {deleting ? "Deleting…" : "Delete Game"}
          </AlertDialog.Trigger>
          <AlertDialog.Backdrop>
            <AlertDialog.Container>
              <AlertDialog.Dialog>
                <AlertDialog.Header>
                  <AlertDialog.Heading>Delete this game?</AlertDialog.Heading>
                </AlertDialog.Header>
                <AlertDialog.Body>
                  This permanently deletes this game and can't be undone. If it was a ranked game, every player's
                  rating will be recalculated.
                </AlertDialog.Body>
                <AlertDialog.Footer className="flex-col items-stretch gap-2">
                  <Button variant="outline" slot="close" className="w-full">
                    Cancel
                  </Button>
                  <Button variant="danger" slot="close" isDisabled={deleting} onPress={handleDelete} className="w-full">
                    Delete Game
                  </Button>
                </AlertDialog.Footer>
              </AlertDialog.Dialog>
            </AlertDialog.Container>
          </AlertDialog.Backdrop>
        </AlertDialog>
      </div>
    </div>
  );
}
