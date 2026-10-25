import { useEffect, useRef, useState } from "react";
import { Button, Card } from "@heroui/react";
import LoadingMeteor from "../LoadingMeteor.jsx";
import LoadError from "../LoadError.jsx";
import { useTournament } from "../../hooks/useTournament.js";
import { updatedElsewhere as isUpdatedElsewhere } from "../../lib/liveScoreSync.js";
import { isGameOver, rulesLabel } from "../../lib/queenOfCourt.js";
import { fetchLiveScore, friendlyError, pushLiveScore, submitMatchScore } from "../../lib/tournamentApi.js";
import { DEFAULT_COLOR_A, DEFAULT_COLOR_B, colorForeground } from "../../lib/teamColors.js";
import { teamNames } from "./tournamentFormat.js";
import { useWakeLock } from "../../hooks/useWakeLock.js";

const LIVE_PUSH_DELAY_MS = 800;
// How often an open scoring screen checks the game's live score, to follow
// another phone scoring the same game and to retry a push that failed.
const FOLLOW_POLL_MS = 4000;

function storageKey(matchId) {
  return `bvc-tournament-score-${matchId}`;
}

// In-progress score survives a reload or the phone locking mid-game.
// `pending`: changed on this phone but not yet confirmed by the server.
// `tappedAt`: when this phone last changed it (ms).
function loadLocal(matchId) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(matchId)));
    if (saved && Number.isInteger(saved.a) && Number.isInteger(saved.b)) {
      const known = Number.isInteger(saved.known?.a) && Number.isInteger(saved.known?.b) ? saved.known : null;
      return { a: saved.a, b: saved.b, pending: saved.pending === true, tappedAt: Number(saved.tappedAt) || 0, known };
    }
  } catch (e) {
    /* storage unavailable */
  }
  return null;
}

function saveLocal(matchId, score) {
  try {
    if (score) localStorage.setItem(storageKey(matchId), JSON.stringify(score));
    else localStorage.removeItem(storageKey(matchId));
  } catch (e) {
    /* storage unavailable */
  }
}

function vibrate(pattern) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

function TeamScorer({ names, score, color, onInc, onDec, label, winning }) {
  return (
    <section
      aria-label={`${label} scoring`}
      className={`flex flex-1 items-stretch gap-2 rounded-2xl border p-2 ${winning ? "border-success bg-success/10" : "border-white/10"}`}
    >
      <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 text-center">
        <p className="m-0 text-[clamp(1rem,4.5vw,1.4rem)] font-bold leading-tight">{names}</p>
        <span
          aria-live="polite"
          className="text-[clamp(4rem,22vw,8rem)] font-extrabold leading-none [font-variant-numeric:tabular-nums]"
        >
          {score}
        </span>
      </div>
      <div className="flex w-24 flex-none flex-col gap-1">
        <Button
          onPress={onInc}
          aria-label={`Add point to ${label}`}
          style={{ "--button-bg": color, "--button-fg": colorForeground(color), backgroundColor: color, color: colorForeground(color) }}
          className="min-h-0 w-full flex-[3_0_0%] rounded-xl text-3xl font-extrabold"
        >
          +1
        </Button>
        <Button
          variant="outline"
          onPress={onDec}
          aria-label={`Remove point from ${label}, fix a mistake`}
          className="min-h-0 w-full flex-[1_0_0%] rounded-xl border-2 border-danger text-lg font-extrabold"
        >
          −1
        </Button>
      </div>
    </section>
  );
}

// The live score shown on the public page belongs to whoever is actually
// tapping. So a phone only sends a score after someone changes it on that
// phone: opening this screen (say, on a second phone) starts from the
// server's live score and never resets it. A phone with its own unsent
// change (it lost signal mid-game) sends it only if nobody has updated the
// server since that phone's last tap; otherwise it drops it and shows the
// newer score. If two phones score the same game, each follows the other's
// taps while it's idle; the latest tap wins.
export default function TournamentScoreScreen({ tournamentId, matchId, onDone }) {
  useWakeLock(true); // keep the screen on while keeping score
  const { model, loading, failed, reload, retry } = useTournament(tournamentId);
  const [saved] = useState(() => loadLocal(matchId));
  const [score, setScore] = useState(() => (saved ? { a: saved.a, b: saved.b } : { a: 0, b: 0 }));
  const [synced, setSynced] = useState(false);
  const [followNote, setFollowNote] = useState("");
  const [typing, setTyping] = useState(false);
  const [typedA, setTypedA] = useState("");
  const [typedB, setTypedB] = useState("");
  const [confirming, setConfirming] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const pushTimer = useRef(null);
  const pendingRef = useRef(Boolean(saved?.pending));
  const tappedAtRef = useRef(saved?.tappedAt || 0);
  // The last score this phone knows is on the server (sent or seen there).
  const knownRef = useRef(saved?.known ?? null);
  // Bumped on every tap, so a server read or push that started before the
  // latest tap can't overwrite it or mark it as sent.
  const tapsRef = useRef(0);
  const scoreRef = useRef(score);
  scoreRef.current = score;

  const match = model?.matches.find((m) => m.id === matchId);
  const finished = match?.status === "final";

  // Best effort: the public page shows this as the live score. A failed
  // push (spotty beach signal) doesn't interrupt scoring; it's retried by
  // the follow loop below.
  function persist(next) {
    saveLocal(matchId, { ...next, pending: pendingRef.current, tappedAt: tappedAtRef.current, known: knownRef.current });
  }

  function push() {
    const sent = scoreRef.current;
    const taps = tapsRef.current;
    pushLiveScore(matchId, sent.a, sent.b)
      .then(() => {
        if (tapsRef.current !== taps) return;
        pendingRef.current = false;
        knownRef.current = { a: sent.a, b: sent.b };
        persist(sent);
      })
      .catch((e) => console.warn("Live score push failed:", e));
  }

  function updatedElsewhere(a, b, updatedAt) {
    return isUpdatedElsewhere({ known: knownRef.current, tappedAt: tappedAtRef.current }, a, b, updatedAt);
  }

  function adopt(a, b, note) {
    pendingRef.current = false;
    knownRef.current = { a, b };
    setScore({ a, b });
    if (note) setFollowNote(note);
  }

  // Starting point once the game has loaded: the server's live score,
  // unless this phone has an unsent change newer than it.
  useEffect(() => {
    if (synced || !match) return;
    if (!pendingRef.current) adopt(match.liveA, match.liveB);
    else if (updatedElsewhere(match.liveA, match.liveB, match.liveUpdatedAt)) {
      adopt(match.liveA, match.liveB, "Another phone updated this game while yours was offline, so this shows its score.");
    }
    setSynced(true);
  }, [match, synced]);

  useEffect(() => {
    if (!synced) return undefined;
    persist(score);
    if (!pendingRef.current) return undefined;
    clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(push, LIVE_PUSH_DELAY_MS);
    return () => clearTimeout(pushTimer.current);
  }, [matchId, score, synced]);

  useEffect(() => {
    if (!synced || finished) return undefined;
    const timer = setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      const taps = tapsRef.current;
      try {
        const row = await fetchLiveScore(matchId);
        if (!row) return;
        // Submitted from another phone: reloading shows the final score.
        if (row.game_id) {
          saveLocal(matchId, null);
          reload();
          return;
        }
        if (tapsRef.current !== taps) return;
        const { live_score_a: a, live_score_b: b, live_updated_at: updatedAt } = row;
        if (pendingRef.current) {
          // An unsent change (a push failed): send it again, unless another
          // phone has scored since, in which case its newer score wins.
          if (updatedElsewhere(a, b, updatedAt)) {
            adopt(a, b, "Another phone scored this game since your last tap, so this shows its score.");
          } else push();
          return;
        }
        const current = scoreRef.current;
        if (a !== current.a || b !== current.b) {
          adopt(a, b, "Updated from another phone keeping score on this game.");
        }
      } catch (e) {
        console.warn("Couldn't check the live score:", e);
      }
    }, FOLLOW_POLL_MS);
    return () => clearInterval(timer);
  }, [matchId, synced, finished, reload]);

  if ((loading && !model) || (match && !synced)) {
    return (
      <div className="flex flex-col items-center gap-3 p-6">
        <LoadingMeteor />
      </div>
    );
  }
  if (!model && failed) return <LoadError what="this game" onRetry={retry} />;
  if (!model || !match) return <p className="p-6 text-center text-muted">This game couldn't be found.</p>;

  const rules = match.rules;
  const nameA = teamNames(model.profilesById, [match.a1, match.a2]);
  const nameB = teamNames(model.profilesById, [match.b1, match.b2]);
  const pool = model.divisions.flatMap((d) => d.pools).find((p) => p.id === match.poolId);
  const heading =
    match.stage === "final"
      ? `${pool?.finalTitle ?? "Final"} · Set ${match.sequence}`
      : `${pool?.title ?? "Pool"} · Game ${match.sequence}`;

  if (match.status === "final") {
    return (
      <div className="flex flex-col items-center gap-3 p-6 text-center">
        <p className="m-0 font-bold">This game already has a score:</p>
        <p className="m-0">
          {nameA} {match.scoreA} – {match.scoreB} {nameB}
        </p>
        <Button variant="primary" onPress={() => onDone()}>
          Back to tournament
        </Button>
      </div>
    );
  }

  const over = isGameOver(score.a, score.b, rules);

  function change(side, delta) {
    pendingRef.current = true;
    tapsRef.current++;
    tappedAtRef.current = Date.now();
    setError("");
    setFollowNote("");
    setConfirming(null);
    setScore((prev) => ({ ...prev, [side]: Math.min(99, Math.max(0, prev[side] + delta)) }));
    vibrate(delta > 0 ? 15 : [10, 30, 10]);
  }

  function requestSubmit(a, b) {
    setError("");
    if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0 || a > 99 || b > 99) {
      setError("Enter both scores as whole numbers.");
      return;
    }
    if (a === b) {
      setError("A game can't end in a tie.");
      return;
    }
    setConfirming({ a, b, unusual: !isGameOver(a, b, rules) });
  }

  async function submit() {
    setSubmitting(true);
    setError("");
    try {
      await submitMatchScore(matchId, confirming.a, confirming.b);
      saveLocal(matchId, null);
      vibrate(20);
      onDone(`Saved: ${nameA} ${confirming.a} – ${confirming.b} ${nameB}`);
    } catch (e) {
      console.error("Failed to submit tournament score:", e);
      setError(friendlyError(e, "Couldn't save the score. Check your signal and try again — nothing was lost."));
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 px-3" style={{ paddingBottom: "calc(0.75rem + var(--safe-bottom))" }}>
      <p className="m-0 text-center text-sm font-bold text-muted">
        {heading} · {rulesLabel(rules)}
      </p>
      {followNote && (
        <p role="status" className="m-0 text-center text-xs font-semibold text-accent">
          {followNote}
        </p>
      )}

      {typing ? (
        <Card className="gap-3 p-4">
          <p className="m-0 font-bold">Enter the final score</p>
          {[
            [nameA, typedA, setTypedA, "team-a-final"],
            [nameB, typedB, setTypedB, "team-b-final"],
          ].map(([name, value, set, id]) => (
            <label key={id} htmlFor={id} className="flex items-center justify-between gap-3">
              <span className="min-w-0 flex-1 text-sm font-semibold">{name}</span>
              <input
                id={id}
                type="number"
                inputMode="numeric"
                min={0}
                max={99}
                value={value}
                onChange={(e) => {
                  setConfirming(null);
                  set(e.target.value);
                }}
                className="w-20 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center text-xl font-bold focus-visible:outline-[3px] focus-visible:outline-accent"
              />
            </label>
          ))}
          <Button
            variant="primary"
            onPress={() => requestSubmit(Number(typedA), Number(typedB))}
            isDisabled={typedA === "" || typedB === ""}
            className="font-bold"
          >
            Review score
          </Button>
          <button type="button" onClick={() => setTyping(false)} className="text-sm font-bold text-muted underline">
            Back to point-by-point scoring
          </button>
        </Card>
      ) : (
        <>
          <TeamScorer
            label="Team A"
            names={nameA}
            score={score.a}
            color={DEFAULT_COLOR_A}
            winning={over && score.a > score.b}
            onInc={() => change("a", 1)}
            onDec={() => change("a", -1)}
          />
          <TeamScorer
            label="Team B"
            names={nameB}
            score={score.b}
            color={DEFAULT_COLOR_B}
            winning={over && score.b > score.a}
            onInc={() => change("b", 1)}
            onDec={() => change("b", -1)}
          />
          {!confirming && (
            <Button
              variant={over ? "primary" : "outline"}
              onPress={() => requestSubmit(score.a, score.b)}
              isDisabled={score.a === score.b}
              className="min-h-12 w-full font-extrabold"
            >
              {over ? `Game over — submit ${score.a}–${score.b}` : "Submit score"}
            </Button>
          )}
          {!confirming && (
            <button type="button" onClick={() => setTyping(true)} className="text-sm font-bold text-muted underline">
              Already finished? Type the final score
            </button>
          )}
        </>
      )}

      {confirming && (
        <Card role="alertdialog" aria-label="Confirm final score" className="gap-2 border border-accent/50 p-4">
          <p className="m-0 font-bold">Submit this final score?</p>
          <p className="m-0">
            {nameA} <b>{confirming.a}</b> – <b>{confirming.b}</b> {nameB}
          </p>
          {confirming.unusual && (
            <p className="m-0 text-sm font-semibold text-warning">
              Heads up: that doesn't look like a finished game under this game's rules.
            </p>
          )}
          <p className="m-0 text-xs text-muted">Only an admin can change it after this.</p>
          <div className="flex gap-2">
            <Button variant="primary" onPress={submit} isDisabled={submitting} className="flex-1 font-bold">
              {submitting ? "Saving…" : "Yes, submit"}
            </Button>
            <Button variant="outline" onPress={() => setConfirming(null)} isDisabled={submitting} className="flex-1 font-bold">
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {error && (
        <p role="alert" className="m-0 text-center text-sm font-semibold text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
