import { Card } from "@heroui/react";
import LoadingMeteor from "./LoadingMeteor.jsx";
import RankBadge from "./RankBadge.jsx";
import { usePlayerGames } from "../hooks/usePlayerGames.js";

function PlayerAvatar({ src }) {
  if (!src) {
    return <span aria-hidden="true" className="h-12 w-12 flex-none rounded-full border border-white/10 bg-white/5" />;
  }
  return <img src={src} alt="" aria-hidden="true" className="h-12 w-12 flex-none rounded-full border border-white/10 object-cover" />;
}

function GameRow({ game }) {
  const result = game.ownScore > game.oppScore ? "win" : game.ownScore < game.oppScore ? "loss" : "tie";
  return (
    <li>
      <Card className="gap-1 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-muted">{game.date}</span>
          <span className="flex-none text-lg font-bold [font-variant-numeric:tabular-nums]">
            <span className={result === "win" ? "text-success" : result === "loss" ? "text-danger" : ""}>
              {game.ownScore}
            </span>
            <span className="text-muted"> – </span>
            <span>{game.oppScore}</span>
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          {game.oppName ? (
            <p className="m-0 min-w-0 truncate text-xs text-muted">vs {game.oppName}</p>
          ) : (
            <span />
          )}
          <span className="flex flex-none items-center gap-1 text-[0.65rem] font-bold text-muted">
            <span>
              {game.format === "indoor"
                ? "🏐 Indoor"
                : game.teamSize
                  ? `${game.teamSize}v${game.teamSize} 🏖️ Beach`
                  : "🏖️ Beach"}
            </span>
            <span>·</span>
            <span className={game.mode === "ranked" ? "text-accent" : ""}>
              {game.mode === "ranked" ? "🏆 Ranked" : "🎲 Casual"}
            </span>
          </span>
        </div>
      </Card>
    </li>
  );
}

export default function PlayerProfileView({ player, onBack }) {
  const { games, loading } = usePlayerGames(player?.id);

  const wins = games.filter((g) => g.ownScore > g.oppScore).length;
  const losses = games.filter((g) => g.ownScore < g.oppScore).length;

  return (
    <main className="flex flex-1 flex-col overflow-y-auto">
      <header
        className="relative flex flex-none items-center px-3 pb-2"
        style={{ paddingTop: "calc(0.5rem + var(--safe-top))" }}
      >
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to rankings"
          className="rounded-lg px-2 py-2 font-bold focus-visible:outline-[3px] focus-visible:outline-accent focus-visible:outline-offset-2"
        >
          &lsaquo; Rankings
        </button>
      </header>

      <div className="flex flex-col gap-3 px-3 pb-6">
        <div className="flex items-center gap-3">
          <PlayerAvatar src={player.avatar_url} />
          <span className="min-w-0 flex-1 truncate text-lg font-bold">{player.display_name}</span>
          {player.tier && <RankBadge tier={player.tier} division={player.division} size={38} />}
        </div>

        {player.elo_games_played > 0 && (
          <p className="m-0 text-sm text-muted">
            {player.elo_rating} Elo · {wins}W – {losses}L
          </p>
        )}

        {loading ? (
          <div className="flex flex-col items-center gap-3 p-6">
            <LoadingMeteor />
            <p className="m-0 text-center text-muted">Loading games…</p>
          </div>
        ) : games.length === 0 ? (
          <p className="p-6 text-center text-muted">No games played yet.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {games.map((game) => (
              <GameRow key={game.id} game={game} />
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
