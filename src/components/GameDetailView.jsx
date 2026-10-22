import { useEffect, useState } from "react";
import { Card } from "@heroui/react";
import LoadingMeteor from "./LoadingMeteor.jsx";
import TournamentGameTag from "./TournamentGameTag.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { fetchGameRecord } from "../hooks/useGameHistory.js";
import { supabase } from "../lib/supabaseClient.js";
import { formatPlayedAt, rosterForSide } from "../lib/gameDetail.js";

function formatLabel(game) {
  if (game.format === "indoor") return "🏐 Indoor";
  return game.teamSize ? `${game.teamSize}v${game.teamSize} 🏖️ Beach` : "2v2 🏖️ Beach";
}

function PlayerLine({ player, delta, onOpenPlayer }) {
  const photo = player.avatarUrl ? (
    <img src={player.avatarUrl} alt="" aria-hidden="true" className="h-9 w-9 flex-none rounded-full border border-white/10 object-cover" />
  ) : (
    <span aria-hidden="true" className="h-9 w-9 flex-none rounded-full border border-white/10 bg-white/5" />
  );
  const deltaText =
    delta == null ? null : (
      <span
        className={`flex-none text-xs font-bold [font-variant-numeric:tabular-nums] ${
          delta > 0 ? "text-success" : delta < 0 ? "text-danger" : "text-muted"
        }`}
      >
        {delta > 0 ? `+${delta}` : delta}
      </span>
    );
  // Typed-in names (no profile) are plain text; linked players open their profile.
  if (!player.id) {
    return (
      <li className="flex items-center gap-2 py-1">
        {photo}
        <span className="min-w-0 flex-1 break-words text-sm">{player.name}</span>
      </li>
    );
  }
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpenPlayer(player.id)}
        aria-label={`View ${player.name}'s profile`}
        className="flex w-full items-center gap-2 rounded-lg py-1 text-left focus-visible:outline-[3px] focus-visible:outline-accent focus-visible:outline-offset-2"
      >
        {photo}
        <span className="min-w-0 flex-1 break-words text-sm font-semibold underline decoration-white/20 underline-offset-2">
          {player.name}
        </span>
        {deltaText}
      </button>
    </li>
  );
}

function TeamColumn({ label, players, won, deltas, onOpenPlayer }) {
  return (
    <section className="flex min-w-0 flex-1 flex-col gap-1">
      <h3 className={`m-0 text-xs font-bold uppercase tracking-wide ${won ? "text-success" : "text-muted"}`}>
        {label}
        {won ? " · Won" : ""}
      </h3>
      {players.length === 0 ? (
        <p className="m-0 text-sm text-muted">No players listed</p>
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {players.map((p, i) => (
            <PlayerLine key={p.id || `typed-${i}`} player={p} delta={p.id ? deltas[p.id] : null} onOpenPlayer={onOpenPlayer} />
          ))}
        </ul>
      )}
    </section>
  );
}

// Full details of one game: when, what kind, the score, both rosters (each
// linked player opens their profile), each player's Elo change for a ranked
// game, and who submitted it. Admins get Edit here. Elo changes come from
// elo_history, which only signed-in members can read (owner's call,
// 2026-10-22: no change to that), so signed-out visitors just don't see them.
export default function GameDetailView({ gameId, refreshKey, onBack, onOpenPlayer, onOpenTournament, onEdit }) {
  const { user, isAdmin } = useAuth();
  const signedIn = Boolean(user);
  const [game, setGame] = useState(null);
  const [deltas, setDeltas] = useState({});
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    (async () => {
      try {
        const record = await fetchGameRecord(gameId);
        let byPlayer = {};
        if (record && record.mode === "ranked" && signedIn) {
          const { data, error } = await supabase.from("elo_history").select("user_id, delta").eq("game_id", gameId);
          if (error) console.error("Failed to load Elo changes:", error);
          byPlayer = Object.fromEntries((data || []).map((h) => [h.user_id, h.delta]));
        }
        if (cancelled) return;
        setGame(record);
        setDeltas(byPlayer);
        setStatus(record ? "ready" : "missing");
      } catch (e) {
        console.error("Failed to load game:", e);
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gameId, refreshKey, signedIn]);

  return (
    <main className="flex flex-1 flex-col overflow-y-auto">
      <header
        className="relative flex flex-none items-center px-3 pb-2"
        style={{ paddingTop: "calc(0.5rem + var(--safe-top))" }}
      >
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="rounded-lg px-2 py-2 font-bold focus-visible:outline-[3px] focus-visible:outline-accent focus-visible:outline-offset-2"
        >
          &lsaquo; Back
        </button>
        <h2 className="m-0 flex-1 pr-12 text-center text-[clamp(1.1rem,4.5vw,1.4rem)] font-bold">Game</h2>
      </header>

      <div className="flex flex-col gap-3 px-3 pb-6">
        {status === "loading" && (
          <div className="flex flex-col items-center gap-3 p-6">
            <LoadingMeteor />
            <p className="m-0 text-center text-muted">Loading game…</p>
          </div>
        )}
        {status === "missing" && <p className="p-6 text-center text-muted">This game no longer exists.</p>}
        {status === "error" && <p className="p-6 text-center text-red-400">Couldn't load this game. Check your connection and try again.</p>}

        {status === "ready" && game && (
          <>
            <div className="flex flex-col gap-1">
              <p className="m-0 text-sm text-muted">{formatPlayedAt(game.date, game.time)}</p>
              <p className="m-0 text-sm font-bold">
                <span className={game.format === "indoor" ? "text-sky-400" : "text-amber-400"}>{formatLabel(game)}</span>
                <span className="text-muted"> · </span>
                <span className={game.mode === "ranked" ? "text-accent" : "text-muted"}>
                  {game.mode === "ranked" ? "🏆 Ranked" : "🎲 Casual"}
                </span>
              </p>
              <TournamentGameTag tag={game.tournament} onOpen={onOpenTournament} />
            </div>

            <Card className="gap-3 p-3">
              <p className="m-0 text-center text-3xl font-bold [font-variant-numeric:tabular-nums]">
                <span className={game.a > game.b ? "text-success" : ""}>{game.a}</span>
                <span className="text-muted"> – </span>
                <span className={game.b > game.a ? "text-success" : ""}>{game.b}</span>
              </p>
              <div className="flex gap-3">
                <TeamColumn label="Team A" players={rosterForSide(game, "a")} won={game.a > game.b} deltas={deltas} onOpenPlayer={onOpenPlayer} />
                <TeamColumn label="Team B" players={rosterForSide(game, "b")} won={game.b > game.a} deltas={deltas} onOpenPlayer={onOpenPlayer} />
              </div>
            </Card>

            {game.mode === "ranked" && !user && (
              <p className="m-0 text-xs text-muted">Sign in to see each player's Elo change.</p>
            )}
            {game.submittedByName && <p className="m-0 text-xs text-muted">Submitted by {game.submittedByName}</p>}

            {isAdmin && (
              <button
                type="button"
                onClick={() => onEdit(game.id)}
                className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 font-bold text-accent focus-visible:outline-[3px] focus-visible:outline-accent focus-visible:outline-offset-2"
              >
                ✏️ Edit game
              </button>
            )}
          </>
        )}
      </div>
    </main>
  );
}
