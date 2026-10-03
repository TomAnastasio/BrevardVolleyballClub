import { useState } from "react";
import { Button } from "@heroui/react";
import { supabase } from "../../lib/supabaseClient.js";

export default function RecomputeEloView() {
  const [status, setStatus] = useState("idle"); // idle | saving | done | error

  async function handleRecompute() {
    setStatus("saving");
    try {
      const { error } = await supabase.rpc("recompute_all_elo");
      if (error) throw error;
      setStatus("done");
    } catch (e) {
      console.error("Failed to recompute Elo ratings:", e);
      setStatus("error");
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        <p className="text-sm text-muted">
          Resets every player's Elo rating to the 1500 default and replays every ranked game from scratch, in play
          order. Use this to fix stale ratings left over from deleted test games, or after editing a past game's
          roster didn't already trigger it.
        </p>
        {status === "done" && (
          <p className="text-sm font-semibold text-success">Done — every rating has been recomputed.</p>
        )}
        {status === "error" && (
          <p role="alert" className="text-sm font-semibold text-red-400">
            Couldn't recompute ratings. Please try again.
          </p>
        )}
      </div>

      <div className="flex-none p-3" style={{ paddingBottom: "calc(0.75rem + var(--safe-bottom))" }}>
        <Button
          variant="primary"
          onPress={handleRecompute}
          isDisabled={status === "saving"}
          className="min-h-14 w-full text-lg font-extrabold"
        >
          {status === "saving" ? "Recomputing…" : "Recompute Now"}
        </Button>
      </div>
    </div>
  );
}
