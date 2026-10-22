import { useState } from "react";
import { Button, Card } from "@heroui/react";
import LoadingMeteor from "../LoadingMeteor.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { useTournament } from "../../hooks/useTournament.js";
import { buildTournamentUrl, setPendingTournament } from "../../lib/tournamentLink.js";
import { friendlyError, undoMatchScore } from "../../lib/tournamentApi.js";
import { formatEventDate, playerName, STATUS_LABELS, teamNames, TITLE_LABELS } from "./tournamentFormat.js";

const POLL_MS = 15000;

function UndoScore({ match, onUndone }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleUndo() {
    setBusy(true);
    setError("");
    try {
      await undoMatchScore(match.gameId);
      await onUndone();
    } catch (e) {
      console.error("Failed to undo score:", e);
      setError(friendlyError(e, "Couldn't undo the score."));
      setBusy(false);
    }
  }

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="mt-1 text-xs font-bold text-muted underline">
        Admin: undo this score
      </button>
    );
  }
  return (
    <div className="mt-2 flex flex-col gap-2">
      <p className="m-0 text-xs">Delete this score so the game can be re-entered? Elo is recalculated.</p>
      <div className="flex gap-2">
        <Button variant="danger" size="sm" onPress={handleUndo} isDisabled={busy}>
          {busy ? "Undoing…" : "Undo score"}
        </Button>
        <Button variant="outline" size="sm" onPress={() => setConfirming(false)} isDisabled={busy}>
          Cancel
        </Button>
      </div>
      {error && <p className="m-0 text-xs font-semibold text-red-400">{error}</p>}
    </div>
  );
}

function MatchRow({ match, label, profilesById, isNext, highlightId, canScore, onPress, isAdmin, onChanged }) {
  const final = match.status === "final";
  const live = match.status === "live";
  const aWon = final && match.scoreA > match.scoreB;
  const bWon = final && match.scoreB > match.scoreA;
  const side = (ids, won, score) => (
    <div className="flex items-center justify-between gap-2">
      <span
        className={`min-w-0 truncate text-sm ${won ? "font-bold" : ""} ${
          ids.includes(highlightId) ? "text-accent" : ""
        }`}
      >
        {teamNames(profilesById, ids)}
      </span>
      <span className={`flex-none text-base font-bold [font-variant-numeric:tabular-nums] ${won ? "text-success" : ""}`}>
        {score}
      </span>
    </div>
  );
  const content = (
    <>
      <div className="mb-1 flex items-center justify-between gap-2 text-xs font-bold text-muted">
        <span>{label}</span>
        {final ? (
          <span>Final</span>
        ) : live ? (
          <span className="text-danger">● Live</span>
        ) : isNext ? (
          <span className="text-accent">Up next</span>
        ) : null}
      </div>
      {side([match.a1, match.a2], aWon, final ? match.scoreA : live ? match.liveA : "")}
      {side([match.b1, match.b2], bWon, final ? match.scoreB : live ? match.liveB : "")}
      {canScore && !final && <p className="m-0 mt-1 text-xs font-bold text-accent">Tap to keep score ›</p>}
    </>
  );
  const cls = `w-full rounded-xl border p-3 text-left ${
    isNext && !final ? "border-accent/50 bg-accent/5" : "border-white/10 bg-white/5"
  }`;
  return (
    <li>
      {canScore && !final ? (
        <button
          type="button"
          onClick={onPress}
          aria-label={`${label}: ${teamNames(profilesById, [match.a1, match.a2])} vs ${teamNames(profilesById, [match.b1, match.b2])}. Keep score`}
          className={`${cls} focus-visible:outline-[3px] focus-visible:outline-accent focus-visible:outline-offset-2`}
        >
          {content}
        </button>
      ) : (
        <div className={cls}>
          {content}
          {isAdmin && final && <UndoScore match={match} onUndone={onChanged} />}
        </div>
      )}
    </li>
  );
}

function StandingsTable({ standings, profilesById, highlightId }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="text-left text-xs text-muted">
            <th className="py-1 pr-2 font-bold">#</th>
            <th className="py-1 pr-2 font-bold">Player</th>
            <th className="py-1 pr-2 text-right font-bold">W–L</th>
            <th className="py-1 text-right font-bold">+/−</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((r) => (
            <tr key={r.id} className={`border-t border-white/10 ${r.id === highlightId ? "text-accent" : ""}`}>
              <td className="py-1.5 pr-2 font-bold">{r.played ? r.place : "–"}</td>
              <td className="max-w-0 truncate py-1.5 pr-2 font-semibold">{playerName(profilesById, r.id)}</td>
              <td className="py-1.5 pr-2 text-right [font-variant-numeric:tabular-nums]">
                {r.wins}–{r.losses}
              </td>
              <td className="py-1.5 text-right [font-variant-numeric:tabular-nums]">
                {r.diff > 0 ? `+${r.diff}` : r.diff}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function TournamentView({ tournamentId, notice, onDismissNotice, onScoreMatch, onManage }) {
  const { user, isAdmin, signInWithGoogle } = useAuth();
  const { model, loading, error, reload } = useTournament(tournamentId, { pollMs: POLL_MS });
  const [divisionId, setDivisionId] = useState(null);
  const [signInPrompt, setSignInPrompt] = useState(false);
  const [copied, setCopied] = useState(false);

  if (loading && !model) {
    return (
      <div className="flex flex-col items-center gap-3 p-6">
        <LoadingMeteor />
        <p className="m-0 text-center text-muted">Loading tournament…</p>
      </div>
    );
  }
  if (!model) return <p className="p-6 text-center text-muted">{error || "This tournament isn't available."}</p>;

  const { tournament: t, divisions, profilesById } = model;
  const myId = user?.id;
  // Default to the signed-in player's own division, else the first one.
  const mine = divisions.find((d) => d.entrants.some((e) => e.profile_id === myId));
  const division = divisions.find((d) => d.id === divisionId) || mine || divisions[0];
  const isLive = t.status === "live";
  const shareUrl = buildTournamentUrl(window.location.origin, t.id, window.location.pathname);

  // The signed-in player's next unscored game, across their division.
  let myNext = null;
  if (myId && mine) {
    for (const pool of mine.pools) {
      const m = pool.matches.find((x) => x.status !== "final" && [x.a1, x.a2, x.b1, x.b2].includes(myId));
      if (m) {
        myNext = { match: m, pool };
        break;
      }
    }
  }

  function handleScore(matchId) {
    if (!user) {
      setSignInPrompt(true);
      return;
    }
    onScoreMatch(matchId);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      setCopied(false);
    }
  }

  const champions = division?.entrants.filter((e) => e.title).sort((a, b) => (a.final_place ?? 9) - (b.final_place ?? 9));

  return (
    <div className="flex flex-col gap-3 px-3 pb-8">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="m-0 text-2xl font-black">{t.name}</h1>
        <p className="m-0 text-sm text-muted">
          {formatEventDate(t.event_date)}
          {t.location ? ` · ${t.location}` : ""}
        </p>
        <p className={`m-0 text-xs font-bold ${isLive ? "text-danger" : "text-accent"}`}>
          {isLive ? "● " : ""}
          {STATUS_LABELS[t.status]}
        </p>
      </div>

      {notice && (
        <p role="status" className="m-0 flex items-start justify-between gap-2 rounded-lg bg-success/15 px-3 py-2 text-sm font-semibold text-success">
          <span>{notice}</span>
          <button type="button" onClick={onDismissNotice} aria-label="Dismiss" className="font-bold">
            &times;
          </button>
        </p>
      )}

      {isAdmin && (
        <Button variant="secondary" onPress={onManage} className="w-full font-bold">
          🛠️ Manage tournament
        </Button>
      )}

      {signInPrompt && (
        <Card className="items-center gap-2 p-4 text-center">
          <p className="m-0 font-bold">Sign in to keep score</p>
          <p className="m-0 text-sm text-muted">Any club member can enter scores. You'll come right back here.</p>
          <Button
            variant="primary"
            onPress={() => {
              setPendingTournament(t.id);
              signInWithGoogle();
            }}
            className="font-bold"
          >
            Sign in with Google
          </Button>
        </Card>
      )}

      {myNext && (
        <Card className="gap-1 border border-accent/40 p-3">
          <p className="m-0 text-xs font-bold uppercase tracking-wide text-accent">Your next game</p>
          <p className="m-0 text-sm">
            Pool {myNext.pool.label}
            {myNext.pool.court ? ` · ${myNext.pool.court}` : ""} · Game {myNext.match.sequence}
            {myNext.pool.nextMatchId === myNext.match.id ? " · up now" : ""}
          </p>
        </Card>
      )}

      {divisions.length > 1 && (
        <div role="tablist" aria-label="Divisions" className="flex gap-1 overflow-x-auto">
          {divisions.map((d) => (
            <button
              key={d.id}
              type="button"
              role="tab"
              aria-selected={d.id === division.id}
              onClick={() => setDivisionId(d.id)}
              className={`flex-none rounded-full px-3 py-1.5 text-sm font-bold ${
                d.id === division.id ? "bg-accent text-accent-foreground" : "bg-white/5 text-foreground"
              }`}
            >
              {d.name}
            </button>
          ))}
        </div>
      )}

      {!division ? (
        <p className="p-6 text-center text-muted">Divisions haven't been set up yet.</p>
      ) : (
        <>
          {champions?.length > 0 && (
            <Card className="gap-1 border border-accent/40 p-4 text-center">
              {champions.map((e) => (
                <p key={e.id} className="m-0 text-lg font-extrabold">
                  {TITLE_LABELS[e.title]} · {playerName(profilesById, e.profile_id)}
                </p>
              ))}
            </Card>
          )}

          {division.finals.length > 0 && (
            <section className="flex flex-col gap-2">
              <h3 className="m-0 text-lg font-extrabold">Finals</h3>
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {division.finals.map((m) => (
                  <MatchRow
                    key={m.id}
                    match={m}
                    label={division.finals.length > 1 ? `Final ${m.sequence}` : "Final"}
                    profilesById={profilesById}
                    isNext={false}
                    highlightId={myId}
                    canScore={isLive}
                    onPress={() => handleScore(m.id)}
                    isAdmin={isAdmin}
                    onChanged={reload}
                  />
                ))}
              </ul>
            </section>
          )}

          {division.pools.length === 0 ? (
            <Card className="gap-1 p-4">
              <p className="m-0 font-bold">Pools haven't been posted yet.</p>
              <p className="m-0 text-sm text-muted">
                {division.entrants.length} player{division.entrants.length === 1 ? "" : "s"} registered
              </p>
            </Card>
          ) : (
            division.pools.map((pool) => (
              <section key={pool.id} className="flex flex-col gap-2">
                <h3 className="m-0 text-lg font-extrabold">
                  {division.pools.some((p) => p.round > 1) ? `Round ${pool.round} · ` : ""}Pool {pool.label}
                  {pool.court && <span className="text-sm font-bold text-muted"> · {pool.court}</span>}
                </h3>
                <Card className="p-3">
                  <StandingsTable standings={pool.standings} profilesById={profilesById} highlightId={myId} />
                </Card>
                <ul className="m-0 flex list-none flex-col gap-2 p-0">
                  {pool.matches.map((m) => (
                    <MatchRow
                      key={m.id}
                      match={m}
                      label={`Game ${m.sequence}`}
                      profilesById={profilesById}
                      isNext={isLive && pool.nextMatchId === m.id}
                      highlightId={myId}
                      canScore={isLive}
                      onPress={() => handleScore(m.id)}
                    isAdmin={isAdmin}
                    onChanged={reload}
                    />
                  ))}
                </ul>
              </section>
            ))
          )}
        </>
      )}

      <Card className="gap-2 p-3">
        <p className="m-0 text-xs font-bold text-muted">Share this page</p>
        <p className="m-0 break-all text-xs">{shareUrl}</p>
        <Button variant="outline" size="sm" onPress={handleCopy} className="self-start font-bold">
          {copied ? "✓ Copied" : "Copy link"}
        </Button>
      </Card>
    </div>
  );
}
