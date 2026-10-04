import { useEffect, useState } from "react";
import { useScoreboardState } from "../../hooks/useScoreboardState.js";
import { useGameHistory } from "../../hooks/useGameHistory.js";
import { useForcedLandscape } from "../../hooks/useForcedLandscape.js";
import { useAuth } from "../../hooks/useAuth.js";
import GameMenu from "./GameMenu.jsx";
import GameFormatMenu from "./GameFormatMenu.jsx";
import GameModeMenu from "./GameModeMenu.jsx";
import GameTrackingSignInGate from "./GameTrackingSignInGate.jsx";
import NewGameForm from "./NewGameForm.jsx";
import GameView from "./GameView.jsx";
import HistoryView from "./HistoryView.jsx";
import EditGameScreen from "./EditGameScreen.jsx";
import LogPastGameScoreScreen from "./LogPastGameScoreScreen.jsx";
import { consumePendingGameTracking, setPendingGameTracking } from "../../lib/pendingGameTracking.js";

const SCREEN_META = {
  menu: { title: "Beach Volleyball Scoreboard", subtitle: "Brevard Volleyball Club" },
  format: { title: "Select Game Type", subtitle: null },
  mode: { title: "Ranked or Casual?", subtitle: null },
  new: { title: "New Game", subtitle: null },
  active: { title: null, subtitle: null },
  history: { title: "Past Games", subtitle: null },
  "edit-game": { title: "Edit Game", subtitle: null },
  "past-score": { title: "Add Score", subtitle: null },
};

const BACK_MAP = {
  format: "menu",
  mode: "format",
  new: "mode",
  active: "menu",
  history: "menu",
  "edit-game": "history",
  "past-score": "new",
};

export default function GameTrackingShell({ onBack }) {
  const scoreboard = useScoreboardState();
  const { history, addGame, logPastGame, historyLoading, refreshHistory, saveError, dismissSaveError } =
    useGameHistory();
  const { user, loading, isConfigured, isAdmin, signInWithGoogle } = useAuth();
  const [screen, setScreen] = useState("menu");
  const [pendingFormat, setPendingFormat] = useState(null);
  const [pendingMode, setPendingMode] = useState(null);
  const [editingGameId, setEditingGameId] = useState(null);
  const [isLoggingPast, setIsLoggingPast] = useState(false);
  const [pastGameDraft, setPastGameDraft] = useState(null);
  const [pastGameSubmitting, setPastGameSubmitting] = useState(false);
  const [pastGameError, setPastGameError] = useState("");

  function handleEditGame(gameId) {
    setEditingGameId(gameId);
    setScreen("edit-game");
  }

  function handleGameEdited() {
    refreshHistory();
    setScreen("history");
  }

  function handleSelectFormat(format) {
    setPendingFormat(format);
    setScreen("mode");
  }

  function handleSelectMode(mode) {
    setPendingMode(mode);
    setScreen("new");
  }

  // Handles the full-page OAuth redirect round trip: the React tree remounts
  // from scratch when the browser returns from Google. There's nothing to
  // resume into (sign-in now happens before format/mode/player selection, so
  // nothing was in progress yet) — this just clears the short-lived
  // sessionStorage breadcrumb (written right before signInWithGoogle() was
  // called) so it can't linger and wrongly redirect a later, unrelated visit
  // within its TTL. App.jsx already used it (non-destructively) at boot to
  // decide to land back on this screen instead of the landing page.
  useEffect(() => {
    consumePendingGameTracking();
  }, []);

  function handleSignIn() {
    setPendingGameTracking();
    signInWithGoogle();
  }

  function handleStartGame(payload) {
    if (isLoggingPast) {
      setPastGameDraft(payload);
      setPastGameError("");
      setScreen("past-score");
      return;
    }
    scoreboard.startGame({ ...payload, mode: pendingMode });
    setScreen("active");
  }

  function handleEraseAndStartNew() {
    setIsLoggingPast(false);
    scoreboard.clearActiveGame();
    setScreen("format");
  }

  function handleLogPastGame() {
    setIsLoggingPast(true);
    setScreen("format");
  }

  async function handlePastGameSubmit({ a, b, date }) {
    if (!pastGameDraft) return;
    setPastGameSubmitting(true);
    setPastGameError("");
    const payload =
      pastGameDraft.format === "indoor"
        ? {
            format: "indoor",
            mode: pendingMode,
            a,
            b,
            playedDate: date,
            teamAPlayers: pastGameDraft.teamAPlayers,
            teamBPlayers: pastGameDraft.teamBPlayers,
          }
        : {
            format: "beach",
            mode: pendingMode,
            a,
            b,
            playedDate: date,
            nameA1: pastGameDraft.nameA1,
            nameA2: pastGameDraft.nameA2,
            nameB1: pastGameDraft.nameB1,
            nameB2: pastGameDraft.nameB2,
            a1: pastGameDraft.playerIdA1,
            a2: pastGameDraft.playerIdA2,
            b1: pastGameDraft.playerIdB1,
            b2: pastGameDraft.playerIdB2,
          };
    const { error } = await logPastGame(payload);
    setPastGameSubmitting(false);
    if (error) {
      setPastGameError(error);
      return;
    }
    setIsLoggingPast(false);
    setPastGameDraft(null);
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
      teamAPlayers: scoreboard.isIndoor ? scoreboard.state.teamAPlayers : undefined,
      teamBPlayers: scoreboard.isIndoor ? scoreboard.state.teamBPlayers : undefined,
    });
    scoreboard.clearActiveGame();
    if (navigator.vibrate) navigator.vibrate(20);
    setScreen("menu");
  }

  // Recording (and even just viewing) anything in Game Tracking requires a
  // signed-in account now, checked before the menu is ever shown — not just
  // when picking "Ranked" partway through the old flow. Skipped entirely
  // when Supabase isn't configured at all, so local-only/offline mode keeps
  // working exactly as before.
  const isLoadingAuth = isConfigured && loading;
  const needsSignIn = isConfigured && !loading && !user;
  const isTopLevel = needsSignIn || isLoadingAuth || screen === "menu";

  const meta = needsSignIn
    ? { title: "Sign In Required", subtitle: null }
    : isLoadingAuth
      ? { title: null, subtitle: null }
      : screen === "new" && isLoggingPast
        ? { title: "Log Past Game", subtitle: null }
        : SCREEN_META[screen];
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
          onClick={() => (isTopLevel ? onBack() : setScreen(BACK_MAP[screen] || "menu"))}
          aria-label={isTopLevel ? "Back to main menu" : "Back to game tracking menu"}
          className="rounded-lg px-2 py-2 font-bold phone-landscape:px-1.5 phone-landscape:py-1 phone-landscape:text-sm focus-visible:outline-[3px] focus-visible:outline-accent focus-visible:outline-offset-2"
        >
          &lsaquo; {isTopLevel ? "Menu" : "Back"}
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
        {isLoadingAuth ? (
          <p className="p-6 text-center text-muted">Loading…</p>
        ) : needsSignIn ? (
          <GameTrackingSignInGate onSignIn={handleSignIn} loading={loading} />
        ) : (
          <>
            {screen === "menu" && (
              <GameMenu
                hasActiveGame={scoreboard.hasActiveGame}
                onNewGame={() => {
                  setIsLoggingPast(false);
                  setScreen("format");
                }}
                onEraseAndStartNew={handleEraseAndStartNew}
                onResumeGame={() => setScreen("active")}
                onPastGames={() => setScreen("history")}
                onLogPastGame={handleLogPastGame}
                isAdmin={isAdmin}
              />
            )}
            {screen === "format" && <GameFormatMenu onSelectFormat={handleSelectFormat} />}
            {screen === "mode" && (
              <GameModeMenu onSelectMode={handleSelectMode} isSupabaseConfigured={isConfigured} />
            )}
            {screen === "new" && (
              <NewGameForm format={pendingFormat} loggingPast={isLoggingPast} onStart={handleStartGame} />
            )}
            {screen === "past-score" && pastGameDraft && (
              <LogPastGameScoreScreen
                format={pastGameDraft.format}
                teamAName={
                  pastGameDraft.format === "indoor"
                    ? pastGameDraft.teamAPlayers.map((p) => p.name).join(", ")
                    : `${pastGameDraft.nameA1} & ${pastGameDraft.nameA2}`
                }
                teamBName={
                  pastGameDraft.format === "indoor"
                    ? pastGameDraft.teamBPlayers.map((p) => p.name).join(", ")
                    : `${pastGameDraft.nameB1} & ${pastGameDraft.nameB2}`
                }
                onSubmit={handlePastGameSubmit}
                submitting={pastGameSubmitting}
                error={pastGameError}
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
                isAdmin={isAdmin}
                onEditGame={handleEditGame}
              />
            )}
            {screen === "edit-game" && <EditGameScreen gameId={editingGameId} onSaved={handleGameEdited} />}
          </>
        )}
      </main>
    </div>
  );
}
