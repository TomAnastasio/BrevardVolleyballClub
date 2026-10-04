import { useEffect, useState } from "react";
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
import EditGameScreen from "./EditGameScreen.jsx";
import LogPastGameScoreScreen from "./LogPastGameScoreScreen.jsx";
import { consumePendingGameTracking, setPendingGameTracking } from "../../lib/pendingGameTracking.js";

const SCREEN_META = {
  menu: { title: "Beach Volleyball Scoreboard", subtitle: "Brevard Volleyball Club" },
  signin: { title: "Sign In Required", subtitle: null },
  format: { title: "Select Game Type", subtitle: null },
  "beach-size": { title: "Beach Team Size", subtitle: null },
  mode: { title: "Ranked or Casual?", subtitle: null },
  new: { title: "New Game", subtitle: null },
  active: { title: null, subtitle: null },
  history: { title: "Past Games", subtitle: null },
  "edit-game": { title: "Edit Game", subtitle: null },
  "past-score": { title: "Add Score", subtitle: null },
};

const BACK_MAP = {
  signin: "menu",
  format: "menu",
  "beach-size": "format",
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
  const [pendingTeamSize, setPendingTeamSize] = useState(null);
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
  // not buried after format/mode selection. ("Log Past Game" needs no
  // separate check here: it only ever renders for an admin, and isAdmin is
  // never true without a signed-in user already.)
  function needsSignInFirst() {
    return isConfigured && !user;
  }

  // Once sign-in completes (including after the OAuth redirect round trip
  // below), carry on into format selection automatically instead of
  // stranding the user on the sign-in screen.
  useEffect(() => {
    if (screen === "signin" && user) {
      setScreen("format");
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
    setScreen(needsSignInFirst() ? "signin" : "format");
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
        : pastGameDraft.teamSize
          ? {
              format: "beach",
              teamSize: pastGameDraft.teamSize,
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
      teamSize: scoreboard.teamSize,
      teamAPlayers: scoreboard.usesRoster ? scoreboard.state.teamAPlayers : undefined,
      teamBPlayers: scoreboard.usesRoster ? scoreboard.state.teamBPlayers : undefined,
    });
    scoreboard.clearActiveGame();
    if (navigator.vibrate) navigator.vibrate(20);
    setScreen("menu");
  }

  const meta = screen === "new" && isLoggingPast ? { title: "Log Past Game", subtitle: null } : SCREEN_META[screen];
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
            onNewGame={() => {
              setIsLoggingPast(false);
              setScreen(needsSignInFirst() ? "signin" : "format");
            }}
            onEraseAndStartNew={handleEraseAndStartNew}
            onResumeGame={() => setScreen("active")}
            onPastGames={() => setScreen("history")}
            onLogPastGame={handleLogPastGame}
            isAdmin={isAdmin}
          />
        )}
        {screen === "signin" && <GameTrackingSignInGate onSignIn={handleSignIn} loading={loading} />}
        {screen === "format" && <GameFormatMenu onSelectFormat={handleSelectFormat} />}
        {screen === "beach-size" && <BeachSizeMenu onSelectSize={handleSelectBeachSize} />}
        {screen === "mode" && <GameModeMenu onSelectMode={handleSelectMode} isSupabaseConfigured={isConfigured} />}
        {screen === "new" && (
          <NewGameForm
            format={pendingFormat}
            teamSize={pendingFormat === "beach" ? pendingTeamSize : null}
            loggingPast={isLoggingPast}
            onStart={handleStartGame}
          />
        )}
        {screen === "past-score" && pastGameDraft && (
          <LogPastGameScoreScreen
            format={pastGameDraft.format}
            teamAName={
              pastGameDraft.format === "indoor" || pastGameDraft.teamSize
                ? pastGameDraft.teamAPlayers.map((p) => p.name).join(", ")
                : `${pastGameDraft.nameA1} & ${pastGameDraft.nameA2}`
            }
            teamBName={
              pastGameDraft.format === "indoor" || pastGameDraft.teamSize
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
      </main>
    </div>
  );
}
