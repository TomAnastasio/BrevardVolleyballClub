import { Card } from "@heroui/react";
import AuthButton from "../AuthButton.jsx";
import { useAuth } from "../../hooks/useAuth.js";

function RosterAvatars({ players, align }) {
  if (!players?.length) return null;
  return (
    <div className={`flex min-w-0 flex-1 flex-wrap gap-1 ${align === "right" ? "justify-end" : ""}`}>
      {players.map((p) =>
        p.avatarUrl ? (
          <img
            key={p.id}
            src={p.avatarUrl}
            alt=""
            aria-hidden="true"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
            className="h-6 w-6 flex-none rounded-full border border-white/10 object-cover"
          />
        ) : (
          <span key={p.id} aria-hidden="true" className="h-6 w-6 flex-none rounded-full bg-white/10" />
        ),
      )}
    </div>
  );
}

export default function HistoryView({ history, historyLoading }) {
  const { user, loading, isConfigured } = useAuth();

  return (
    <div className="flex flex-1 flex-col overflow-y-auto px-3 pt-3 pb-6">
      <div className="mb-2 flex items-center justify-end">
        <AuthButton />
      </div>
      {isConfigured && !loading && !user && (
        <p className="mb-2 text-sm text-muted">Sign in to sync your games across devices.</p>
      )}
      {historyLoading ? (
        <p className="p-6 text-center text-muted">Loading your games…</p>
      ) : history.length === 0 ? (
        <p className="p-6 text-center text-muted">No games saved yet. Finish a game to see it here.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {history.map((game) => (
            <li key={game.id}>
              <Card className="gap-1 p-3">
                <div className="flex items-center justify-between gap-2 font-bold">
                  <span className={`min-w-0 break-words ${game.a > game.b ? "text-success" : ""}`}>
                    {game.nameA}
                  </span>
                  <span className="flex-none text-lg [font-variant-numeric:tabular-nums]">
                    {game.a} – {game.b}
                  </span>
                  <span className={`min-w-0 break-words text-right ${game.b > game.a ? "text-success" : ""}`}>
                    {game.nameB}
                  </span>
                </div>
                {game.format === "indoor" && (
                  <div className="flex items-start justify-between gap-2">
                    <RosterAvatars players={game.teamAPlayers} />
                    <RosterAvatars players={game.teamBPlayers} align="right" />
                  </div>
                )}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-muted">
                    {game.date} at {game.time}
                  </span>
                  <span
                    className={`flex-none rounded-full border px-2 py-0.5 text-xs font-bold ${
                      game.mode === "ranked"
                        ? "border-accent/40 bg-accent/10 text-accent"
                        : "border-white/10 bg-white/5 text-muted"
                    }`}
                  >
                    {game.mode === "ranked" ? "🏆 Ranked" : "🎲 Casual"}
                  </span>
                </div>
                {user && game.submittedByName && game.submittedByUserId !== user.id && (
                  <p className="m-0 text-xs text-muted">Submitted by {game.submittedByName}</p>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
