import { useEffect, useState } from "react";
import { useScoreboardState } from "../../hooks/useScoreboardState.js";
import { useGameHistory } from "../../hooks/useGameHistory.js";
import { useForcedLandscape } from "../../hooks/useForcedLandscape.js";
import { useAuth } from "../../hooks/useAuth.js";
import { AuthProvider } from "../../hooks/AuthContext.jsx";
import GameMenu from "./GameMenu.jsx";
import GameFormatMenu from "./GameFormatMenu.jsx";
import GameModeMenu from "./GameModeMenu.jsx";
import RankedSignInGate from "./RankedSignInGate.jsx";
import NewGameForm from "./NewGameForm.jsx";
import GameView from "./GameView.jsx";
import HistoryView from "./HistoryView.jsx";

const SCREEN_META = {
  menu: { title: "Beach Volleyball Scoreboard", subtitle: "Brevard Volleyball Club" },
  format: { title: "Select Game Type", subtitle: null },
  mode: { title: "Ranked or Casual?", subtitle: null },
  signin: { title: "Sign In Required", subtitle: null },
  new: { title: "New Game", subtitle: null },
  active: { title: null, subtitle: null },
  history: { title: "Past Games", subtitle: null },
};

const BACK_MAP = { format: "menu", mode: "format", signin: "mode", new: "mode", active: "menu", history: "menu" };

const PENDING_RANKED_GAME_KEY = "bvc-pending-ranked-game";
const PENDING_RANKED_GAME_TTL_MS = 5 * 60 * 1000;

export default function GameTrackingShell({ onBack }) {
  return (
    <AuthProvider>
      <GameTrackingShellInner onBack={onBack} />
    </AuthProvider>
  );
}

function GameTrackingShellInner({ onBack }) {
  const scoreboard = useScoreboardState();
  const { history, addGame } = useGameHistory();
  const { user, loading, isConfigured, signInWithGoogle } = useAuth();
  const [screen, setScreen] = useState("menu");
  const [pendingFormat, setPendingFormat] = useState(null);
  const [pendingMode, setPendingMode] = useState(null);

  function handleSelectFormat(format) {
    setPendingFormat(format);
    setScreen("mode");
  }

  function handleSelectMode(mode) {
    setPendingMode(mode);
    if (mode === "ranked" && !user) {
      setScreen("signin");
    } else {
      setScreen("new");
    }
  }

  useEffect(() => {
    if (screen === "signin" && user) {
      setScreen("new");
    }
  }, [screen, user]);

  // Handles the full-page OAuth redirect round trip: the React tree remounts
  // from scratch when the browser returns from Google, so any in-progress
  // pendingFormat/pendingMode/screen state set before the redirect is gone.
  // This reads back a short-lived sessionStorage breadcrumb (written right
  // before signInWithGoogle() was called) and resumes straight into the
  // "new" game screen for a signed-in user, skipping format/mode re-selection.
  useEffect(() => {
    let raw;
    try {
      raw = sessionStorage.getItem(PENDING_RANKED_GAME_KEY);
    } catch (e) {
      raw = null;
    }
    if (!raw) return;

    try {
      sessionStorage.removeItem(PENDING_RANKED_GAME_KEY);
    } catch (e) {
      /* storage unavailable, continue without persistence */
    }

    let pending;
    try {
      pending = JSON.parse(raw);
    } catch (e) {
      return;
    }

    if (!pending || typeof pending.expiresAt !== "number") return;
    if (Date.now() >= pending.expiresAt) return;
    if (!user) return;

    setPendingFormat(pending.format);
    setPendingMode("ranked");
    setScreen("new");
  }, [user]);

  function handleRankedSignIn() {
    try {
      sessionStorage.setItem(
        PENDING_RANKED_GAME_KEY,
        JSON.stringify({ format: pendingFormat, expiresAt: Date.now() + PENDING_RANKED_GAME_TTL_MS }),
      );
    } catch (e) {
      /* storage unavailable, continue without persistence */
    }
    signInWithGoogle();
  }

  function handleStartGame(payload) {
    scoreboard.startGame({ ...payload, mode: pendingMode });
    setScreen("active");
  }

  function handleEraseAndStartNew() {
    scoreboard.clearActiveGame();
    setScreen("format");
  }

  function handleSaveGame() {
    addGame({
      nameA: scoreboard.teamAName,
      nameB: scoreboard.teamBName,
      a: scoreboard.state.a,
      b: scoreboard.state.b,
      mode: scoreboard.state.mode,
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
          onClick={() => (isMenu ? onBack() : setScreen(BACK_MAP[screen] || "menu"))}
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

      <main className="flex min-h-0 flex-1 flex-col">
        {screen === "menu" && (
          <GameMenu
            hasActiveGame={scoreboard.hasActiveGame}
            onNewGame={() => setScreen("format")}
            onEraseAndStartNew={handleEraseAndStartNew}
            onResumeGame={() => setScreen("active")}
            onPastGames={() => setScreen("history")}
          />
        )}
        {screen === "format" && <GameFormatMenu onSelectFormat={handleSelectFormat} />}
        {screen === "mode" && (
          <GameModeMenu onSelectMode={handleSelectMode} isSupabaseConfigured={isConfigured} authLoading={loading} />
        )}
        {screen === "signin" && <RankedSignInGate onSignIn={handleRankedSignIn} loading={loading} />}
        {screen === "new" && <NewGameForm format={pendingFormat} onStart={handleStartGame} />}
        {screen === "active" && scoreboard.state && (
          <GameView
            scoreboard={scoreboard}
            onSaveGame={handleSaveGame}
            effectiveWidth={effectiveWidth}
            effectiveHeight={effectiveHeight}
          />
        )}
        {screen === "history" && <HistoryView history={history} />}
      </main>
    </div>
  );
}
