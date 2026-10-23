import { useEffect, useRef, useState } from "react";
import { useScoreboardState } from "../../hooks/useScoreboardState.js";
import { useGameHistory } from "../../hooks/useGameHistory.js";
import { useForcedLandscape } from "../../hooks/useForcedLandscape.js";
import { useAuth } from "../../hooks/useAuth.js";
import GameMenu from "./GameMenu.jsx";
import GameFormatMenu from "./GameFormatMenu.jsx";
import BeachSizeMenu from "./BeachSizeMenu.jsx";
import GameModeMenu from "./GameModeMenu.jsx";
import GameTrackingSignInGate from "./GameTrackingSignInGate.jsx";
import NewGameForm from "./NewGameForm.jsx";
import GameView from "./GameView.jsx";
import HistoryView from "./HistoryView.jsx";
import FinalScoreScreen from "./FinalScoreScreen.jsx";
import GameEntryMenu from "./GameEntryMenu.jsx";
import { consumePendingGameTracking, setPendingGameTracking } from "../../lib/pendingGameTracking.js";

const SCREEN_META = {
  menu: { title: "Beach Volleyball Scoreboard", subtitle: "Brevard Volleyball Club" },
  signin: { title: "Sign In Required", subtitle: null },
  entry: { title: "How Do You Want to Log It?", subtitle: null },
  format: { title: "Select Game Type", subtitle: null },
  "beach-size": { title: "Beach Team Size", subtitle: null },
  mode: { title: "Ranked or Casual?", subtitle: null },
  new: { title: "New Game", subtitle: null },
  active: { title: null, subtitle: null },
  history: { title: "Past Games", subtitle: null },
  "final-score": { title: "Final Score", subtitle: null },
};

const BACK_MAP = {
  signin: "menu",
  entry: "menu",
  format: "entry",
  "beach-size": "format",
  new: "mode",
  active: "menu",
  history: "menu",
  "final-score": "new",
};

export default function GameTrackingShell({ onBack, onOpenGame, onOpenTournament, gamesVersion }) {
  const scoreboard = useScoreboardState();
  const { history, addGame, historyLoading, refreshHistory, saveError, dismissSaveError } =
    useGameHistory();
  const { user, loading, isConfigured, signInWithGoogle } = useAuth();
  const [screen, setScreen] = useState("menu");
  const [pendingFormat, setPendingFormat] = useState(null);
  const [pendingTeamSize, setPendingTeamSize] = useState(null);
  const [pendingMode, setPendingMode] = useState(null);
  // "Enter Final Score" (vs. the live scoreboard): same setup screens, then
  // the score is typed in at the end instead of tracked point by point.
  const [isFinalScoreEntry, setIsFinalScoreEntry] = useState(false);
  const [finalScoreDraft, setFinalScoreDraft] = useState(null);

  // Admin edits/deletes now happen from a game's details screen (App.jsx),
  // which bumps `gamesVersion`; refetch so Past Games reflects them.
  const firstGamesVersion = useRef(gamesVersion);
  useEffect(() => {
    if (gamesVersion !== firstGamesVersion.current) refreshHistory();
  }, [gamesVersion, refreshHistory]);

  function handleSelectFormat(format) {
    setPendingFormat(format);
    setPendingTeamSize(null);
    setScreen(format === "beach" ? "beach-size" : "mode");
  }

  function handleSelectBeachSize(size) {
    setPendingTeamSize(size);
    setScreen("mode");
  }

  function handleSelectMode(mode) {
    setPendingMode(mode);
    setScreen("new");
  }

  // Anyone can browse the menu and Past Games, but recording a game still
  // needs a signed-in account — checked right when "New Game" is pressed,
  // not buried after format/mode selection.
  function needsSignInFirst() {
    return isConfigured && !user;
  }

  // Once sign-in completes (including after the OAuth redirect round trip
  // below), carry on into the live-vs-final-score choice automatically
  // instead of stranding the user on the sign-in screen.
  useEffect(() => {
    if (screen === "signin" && user) {
      setScreen("entry");
    }
  }, [screen, user]);

  // Handles the full-page OAuth redirect round trip: the React tree remounts
  // from scratch when the browser returns from Google. Nothing was in
  // progress yet (format/mode/players are all chosen after sign-in), so this
  // just clears the short-lived sessionStorage breadcrumb (written right
  // before signInWithGoogle() was called) so it can't linger and wrongly
  // redirect a later, unrelated visit within its TTL. App.jsx already used it
  // (non-destructively) at boot to decide to land back on this screen
  // instead of the landing page.
  useEffect(() => {
    consumePendingGameTracking();
  }, []);

  function handleSignIn() {
    setPendingGameTracking();
    signInWithGoogle();
  }

  function handleStartGame(payload) {
    if (isFinalScoreEntry) {
      setFinalScoreDraft(payload);
      setScreen("final-score");
      return;
    }
    scoreboard.startGame({ ...payload, mode: pendingMode });
    setScreen("active");
  }

  function handleEraseAndStartNew() {
    scoreboard.clearActiveGame();
    setScreen(needsSignInFirst() ? "signin" : "entry");
  }

  function handleSelectEntry(entry) {
    setIsFinalScoreEntry(entry === "final");
    setScreen("format");
  }

  // Saves through the exact same path as a finished live game (same
  // player linking, same Elo update, dated now), just with the score typed
  // in instead of tracked point by point — so it works for every signed-in
  // player, not only admins.
  function handleFinalScoreSubmit({ a, b }) {
    const draft = finalScoreDraft;
    if (!draft) return;
    const usesRoster = draft.format === "indoor" || Boolean(draft.teamSize);
    addGame({
      nameA: draftTeamName(draft, "a"),
      nameB: draftTeamName(draft, "b"),
      a,
      b,
      mode: pendingMode,
      participants: usesRoster
        ? [
            ...draft.teamAPlayers.map((p) => ({ team: "a", userId: p.id })),
            ...draft.teamBPlayers.map((p) => ({ team: "b", userId: p.id })),
          ]
        : [
            { slot: "a2", userId: draft.playerIdA2 },
            { slot: "b1", userId: draft.playerIdB1 },
            { slot: "b2", userId: draft.playerIdB2 },
          ].filter((p) => p.userId),
      format: draft.format,
      teamSize: draft.teamSize ?? null,
      teamAPlayers: usesRoster ? draft.teamAPlayers : undefined,
      teamBPlayers: usesRoster ? draft.teamBPlayers : undefined,
      playerIdA1: usesRoster ? undefined : draft.playerIdA1,
    });
    if (navigator.vibrate) navigator.vibrate(20);
    setFinalScoreDraft(null);
    setIsFinalScoreEntry(false);
    setScreen("history");
  }

  function handleSaveGame() {
    addGame({
      nameA: scoreboard.teamAName,
      nameB: scoreboard.teamBName,
      a: scoreboard.state.a,
      b: scoreboard.state.b,
      mode: scoreboard.state.mode,
      participants: scoreboard.participants,
      format: scoreboard.format,
      teamSize: scoreboard.teamSize,
      teamAPlayers: scoreboard.usesRoster ? scoreboard.state.teamAPlayers : undefined,
      teamBPlayers: scoreboard.usesRoster ? scoreboard.state.teamBPlayers : undefined,
      playerIdA1: scoreboard.usesRoster ? undefined : scoreboard.state.playerIdA1,
    });
    scoreboard.clearActiveGame();
    if (navigator.vibrate) navigator.vibrate(20);
    setScreen("menu");
  }

  const meta = SCREEN_META[screen];
  const isMenu = screen === "menu";
  const { forced, width: effectiveWidth, height: effectiveHeight } = useForcedLandscape(screen === "active");
  const isPhoneLandscape = effectiveHeight <= 520;

  return (
    <div
      className={`flex min-h-0 flex-1 flex-col ${forced ? "force-landscape" : ""} ${
        isPhoneLandscape ? "is-phone-landscape" : ""
      }`}
    >
      <header
        className="flex items-center gap-2 px-2 pb-1 phone-landscape:pb-0"
        style={{ paddingTop: "calc(0.5rem + var(--safe-top))" }}
      >
        <button
          type="button"
          onClick={() =>
            isMenu
              ? onBack()
              : setScreen(screen === "mode" ? (pendingFormat === "beach" ? "beach-size" : "format") : BACK_MAP[screen] || "menu")
          }
          aria-label={isMenu ? "Back to main menu" : "Back to game tracking menu"}
          className="rounded-lg px-2 py-2 font-bold phone-landscape:px-1.5 phone-landscape:py-1 phone-landscape:text-sm focus-visible:outline-[3px] focus-visible:outline-accent focus-visible:outline-offset-2"
        >
          &lsaquo; {isMenu ? "Menu" : "Back"}
        </button>
        <div className="flex-1 pr-12 text-center phone-landscape:pr-9">
          {meta.title && (
            <h1 className="m-0 text-[clamp(1rem,4vw,1.4rem)] font-bold phone-landscape:text-sm">{meta.title}</h1>
          )}
          {meta.subtitle && (
            <p className="m-0 mt-0.5 text-sm text-muted phone-landscape:hidden">{meta.subtitle}</p>
          )}
        </div>
      </header>

      {saveError && (
        <p
          role="alert"
          className="mx-2 mb-1 flex items-start justify-between gap-2 rounded-lg border border-red-500 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400"
        >
          <span>{saveError}</span>
          <button
            type="button"
            onClick={dismissSaveError}
            aria-label="Dismiss"
            className="shrink-0 font-bold leading-none focus-visible:outline-[3px] focus-visible:outline-accent focus-visible:outline-offset-2"
          >
            &times;
          </button>
        </p>
      )}

      <main className="flex min-h-0 flex-1 flex-col">
        {screen === "menu" && (
          <GameMenu
            hasActiveGame={scoreboard.hasActiveGame}
            onNewGame={() => setScreen(needsSignInFirst() ? "signin" : "entry")}
            onEraseAndStartNew={handleEraseAndStartNew}
            onResumeGame={() => setScreen("active")}
            onPastGames={() => setScreen("history")}
          />
        )}
        {screen === "signin" && <GameTrackingSignInGate onSignIn={handleSignIn} loading={loading} />}
        {screen === "entry" && <GameEntryMenu onSelectEntry={handleSelectEntry} />}
        {screen === "format" && <GameFormatMenu onSelectFormat={handleSelectFormat} />}
        {screen === "beach-size" && <BeachSizeMenu onSelectSize={handleSelectBeachSize} />}
        {screen === "mode" && <GameModeMenu onSelectMode={handleSelectMode} isSupabaseConfigured={isConfigured} />}
        {screen === "new" && (
          <NewGameForm
            format={pendingFormat}
            teamSize={pendingFormat === "beach" ? pendingTeamSize : null}
            enteringFinalScore={isFinalScoreEntry}
            onStart={handleStartGame}
          />
        )}
        {screen === "final-score" && finalScoreDraft && (
          <FinalScoreScreen
            format={finalScoreDraft.format}
            teamAName={draftTeamName(finalScoreDraft, "a")}
            teamBName={draftTeamName(finalScoreDraft, "b")}
            onSubmit={handleFinalScoreSubmit}
          />
        )}
        {screen === "active" && scoreboard.state && (
          <GameView
            scoreboard={scoreboard}
            onSaveGame={handleSaveGame}
            effectiveWidth={effectiveWidth}
            effectiveHeight={effectiveHeight}
          />
        )}
        {screen === "history" && (
          <HistoryView
            history={history}
            historyLoading={historyLoading}
            onOpenGame={onOpenGame}
            onOpenTournament={onOpenTournament}
          />
        )}
      </main>
    </div>
  );
}

function draftTeamName(draft, team) {
  const usesRoster = draft.format === "indoor" || Boolean(draft.teamSize);
  if (usesRoster) return (team === "a" ? draft.teamAPlayers : draft.teamBPlayers).map((p) => p.name).join(", ");
  return team === "a" ? `${draft.nameA1} & ${draft.nameA2}` : `${draft.nameB1} & ${draft.nameB2}`;
}
