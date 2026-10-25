import { Card } from "@heroui/react";
import { useAuth } from "../../hooks/useAuth.js";
import TournamentGameTag from "../TournamentGameTag.jsx";
import { stagger } from "../../lib/motion.js";
import { playerPhoto } from "../../themes/playerPhoto.js";

// Capped at 8 per team (two rows of 4) to keep a big indoor roster from
// blowing up the card's height — see HistoryView's goal of compact cards.
const MAX_ROSTER_PHOTOS = 8;
const ROSTER_ROW_SIZE = 4;

function RosterAvatars({ players, align }) {
  if (!players?.length) return null;
  return (
    <div className={`flex flex-wrap gap-1 ${align === "right" ? "justify-end" : ""}`}>
      {players.map((p) => ({ ...p, photoUrl: playerPhoto(p.avatarUrl, p.id) })).map((p) =>
        p.photoUrl ? (
          <img
            key={p.id}
            src={p.photoUrl}
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

function GameCardBody({ game, user, onOpenTournament }) {
  const isIndoor = game.format === "indoor";
  const teamAPlayers = (game.teamAPlayers || []).slice(0, MAX_ROSTER_PHOTOS);
  const teamBPlayers = (game.teamBPlayers || []).slice(0, MAX_ROSTER_PHOTOS);
  const teamARow2 = teamAPlayers.slice(ROSTER_ROW_SIZE);
  const teamBRow2 = teamBPlayers.slice(ROSTER_ROW_SIZE);
  const hasOverflowRow = teamARow2.length > 0 || teamBRow2.length > 0;
  return (
    <>
      <div className="relative flex items-center justify-center">
        <span className="absolute left-0 text-xs text-muted">{game.date}</span>
        <span
          className={`text-[0.62rem] font-bold uppercase tracking-wide ${
            isIndoor ? "text-sky-400" : "text-amber-400"
          }`}
        >
          {isIndoor ? "🏐 Indoor" : game.teamSize ? `${game.teamSize}v${game.teamSize} 🏖️ Beach` : "🏖️ Beach"}
        </span>
        <span
          className={`absolute right-0 flex-none rounded-full border px-2 py-0.5 text-xs font-bold ${
            game.mode === "ranked" ? "border-accent/40 bg-accent/10 text-accent" : "border-white/10 bg-white/5 text-muted"
          }`}
        >
          {game.mode === "ranked" ? "🏆 Ranked" : "🎲 Casual"}
        </span>
      </div>
      <TournamentGameTag tag={game.tournament} onOpen={onOpenTournament} />
      <div className="flex items-center justify-between gap-2 font-bold">
        <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
          {!isIndoor && (
            <span className={`break-words ${game.a > game.b ? "text-success" : ""}`}>{game.nameA}</span>
          )}
          <RosterAvatars players={teamAPlayers.slice(0, ROSTER_ROW_SIZE)} />
        </div>
        <span className="flex-none text-lg [font-variant-numeric:tabular-nums]">
          {game.a} – {game.b}
        </span>
        <div className="flex min-w-0 flex-1 flex-col items-end gap-1">
          {!isIndoor && (
            <span className={`break-words text-right ${game.b > game.a ? "text-success" : ""}`}>{game.nameB}</span>
          )}
          <RosterAvatars players={teamBPlayers.slice(0, ROSTER_ROW_SIZE)} align="right" />
        </div>
      </div>
      {hasOverflowRow && (
        <div className="flex items-start justify-between gap-2">
          <RosterAvatars players={teamARow2} />
          <RosterAvatars players={teamBRow2} align="right" />
        </div>
      )}
      {user && game.submittedByName && game.submittedByUserId !== user.id && (
        <p className="m-0 text-xs text-muted">Submitted by {game.submittedByName}</p>
      )}
    </>
  );
}

// Shown on a game that's saved on this phone but not on the server yet
// (see gameUploadQueue.js). It sits above the card's details button, which
// a not-yet-uploaded game doesn't have anyway.
function UploadStatus({ game, onRetry, onRemove }) {
  const rejected = game.upload.status === "rejected";
  // First try still going (a normal save takes a moment): no alarm yet.
  if (!rejected && !game.upload.tried) {
    return <p className="m-0 mt-1 text-xs font-semibold text-muted">Uploading…</p>;
  }
  function handleRemove() {
    if (window.confirm("Remove this game from this phone? It was never uploaded, so it will be gone for good.")) {
      onRemove(game.id);
    }
  }
  return (
    <div
      className={`mt-1 flex flex-wrap items-center justify-between gap-2 rounded-lg border px-2 py-1.5 text-xs font-semibold ${
        rejected ? "border-red-500 bg-red-500/10 text-red-400" : "border-amber-400/60 bg-amber-400/10 text-amber-300"
      }`}
    >
      <span>
        {rejected
          ? `Not uploaded: ${game.upload.error || "the server refused it."} Only on this phone.`
          : "⏳ Waiting to upload. Saved on this phone; it'll upload when you have signal."}
      </span>
      <span className="flex gap-2">
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md border border-current px-2 py-0.5 font-bold focus-visible:outline-[3px] focus-visible:outline-accent focus-visible:outline-offset-2"
        >
          Retry
        </button>
        {rejected && (
          <button
            type="button"
            onClick={handleRemove}
            className="rounded-md border border-current px-2 py-0.5 font-bold focus-visible:outline-[3px] focus-visible:outline-accent focus-visible:outline-offset-2"
          >
            Remove
          </button>
        )}
      </span>
    </div>
  );
}

export default function HistoryView({
  history,
  historyLoading,
  onOpenGame,
  onOpenTournament,
  onRetryUpload,
  onRemoveUpload,
}) {
  const { user } = useAuth();

  return (
    <div className="flex flex-1 flex-col overflow-y-auto px-3 pt-3 pb-6">
      {historyLoading ? (
        <p className="p-6 text-center text-muted">Loading your games…</p>
      ) : history.length === 0 ? (
        <p className="p-6 text-center text-muted">No games saved yet. Finish a game to see it here.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {history.map((game, index) => (
            // The details button is stretched over the whole card rather than
            // wrapping it, so the card's own tournament tag button isn't a
            // (invalid) button inside a button; the tag sits above it. A
            // game saved only on this device (signed out, an old "game-…"
            // id, or still waiting to upload) has no server copy to show,
            // so it isn't tappable.
            <li key={game.id} className={`animate-rise-in relative transition-transform duration-150 has-[>button:active]:scale-[0.98]`} style={stagger(index)}>
              <Card className="gap-1 p-3">
                <GameCardBody game={game} user={user} onOpenTournament={onOpenTournament} />
                {game.upload && <UploadStatus game={game} onRetry={onRetryUpload} onRemove={onRemoveUpload} />}
              </Card>
              {!game.upload && game.synced !== false && !String(game.id).startsWith("game-") && (
                <button
                  type="button"
                  onClick={() => onOpenGame(game.id)}
                  aria-label={`Game details: ${game.nameA} vs ${game.nameB}, ${game.date}`}
                  className="absolute inset-0 rounded-2xl focus-visible:outline-[3px] focus-visible:outline-accent focus-visible:outline-offset-2"
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
