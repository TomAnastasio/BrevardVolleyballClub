import { Card } from "@heroui/react";
import LoadingMeteor from "./LoadingMeteor.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { useLeaderboard } from "../hooks/useLeaderboard.js";

function PlayerAvatar({ src }) {
  if (!src) {
    return <span aria-hidden="true" className="h-9 w-9 flex-none rounded-full border border-white/10 bg-white/5" />;
  }
  return <img src={src} alt="" aria-hidden="true" className="h-9 w-9 flex-none rounded-full border border-white/10 object-cover" />;
}

export default function LeaderboardView({ onBack }) {
  const { user, isConfigured } = useAuth();
  const { players, loading } = useLeaderboard(isConfigured);

  return (
    <main className="flex flex-1 flex-col overflow-y-auto">
      <header
        className="relative flex flex-none items-center px-3 pb-2"
        style={{ paddingTop: "calc(0.5rem + var(--safe-top))" }}
      >
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to menu"
          className="rounded-lg px-2 py-2 font-bold focus-visible:outline-[3px] focus-visible:outline-accent focus-visible:outline-offset-2"
        >
          &lsaquo; Menu
        </button>
        <h2 className="m-0 flex-1 pr-12 text-center text-[clamp(1.1rem,4.5vw,1.4rem)] font-bold">
          County Rankings
        </h2>
      </header>

      <div className="flex flex-col gap-2 px-3 pb-6">
        {!isConfigured ? (
          <p className="p-6 text-center text-muted">Rankings aren't available yet.</p>
        ) : loading ? (
          <div className="flex flex-col items-center gap-3 p-6">
            <LoadingMeteor />
            <p className="m-0 text-center text-muted">Loading rankings…</p>
          </div>
        ) : players.length === 0 ? (
          <p className="p-6 text-center text-muted">No ranked games played yet.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {players.map((player, index) => {
              const isSelf = player.id === user?.id;
              return (
                <li key={player.id}>
                  <Card className={`gap-1 p-3 ${isSelf ? "border border-accent/60 bg-accent/5" : ""}`}>
                    <div className="flex items-center gap-3">
                      <span className="w-6 flex-none text-center font-bold text-muted">{index + 1}</span>
                      <PlayerAvatar src={player.avatar_url} />
                      <span className="min-w-0 flex-1 truncate font-bold">
                        {player.display_name}
                        {isSelf && <span className="ml-1 font-normal text-muted">(you)</span>}
                      </span>
                      <span className="flex-none text-right [font-variant-numeric:tabular-nums]">
                        <span className="text-lg font-extrabold">{player.elo_rating}</span>
                        <span className="block text-xs text-muted">{player.elo_games_played} games</span>
                      </span>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
