import { useEffect, useState } from "react";
import LoadingMeteor from "./LoadingMeteor.jsx";
import PlayerProfileView from "./PlayerProfileView.jsx";
import { fetchRankedProfiles } from "../hooks/useLeaderboard.js";

// A player's profile opened from just their id (e.g. tapping a name in a
// game's details), with the same Elo/tier data Rankings would hand it.
export default function PlayerProfileById({ playerId, onBack, backLabel = "Back", ...profileProps }) {
  const [player, setPlayer] = useState(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    fetchRankedProfiles().then((profiles) => {
      if (cancelled) return;
      const found = profiles?.find((p) => p.id === playerId);
      setPlayer(found || null);
      setStatus(found ? "ready" : profiles ? "missing" : "error");
    });
    return () => {
      cancelled = true;
    };
  }, [playerId]);

  if (status === "ready") return <PlayerProfileView player={player} onBack={onBack} backLabel={backLabel} {...profileProps} />;

  return (
    <main className="animate-view-in flex flex-1 flex-col overflow-y-auto">
      <header
        className="relative flex flex-none items-center px-3 pb-2"
        style={{ paddingTop: "calc(0.5rem + var(--safe-top))" }}
      >
        <button
          type="button"
          onClick={onBack}
          aria-label={backLabel === "Menu" ? "Back to main menu" : "Back"}
          className="rounded-lg px-2 py-2 font-bold focus-visible:outline-[3px] focus-visible:outline-accent focus-visible:outline-offset-2"
        >
          &lsaquo; {backLabel}
        </button>
      </header>
      {status === "loading" ? (
        <div className="flex flex-col items-center gap-3 p-6">
          <LoadingMeteor />
          <p className="m-0 text-center text-muted">Loading player…</p>
        </div>
      ) : (
        <p className="p-6 text-center text-muted">
          {status === "missing" ? "This player's profile isn't available." : "Couldn't load this player. Try again."}
        </p>
      )}
    </main>
  );
}
