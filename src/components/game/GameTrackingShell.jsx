import { useState } from "react";
import { useScoreboardState } from "../../hooks/useScoreboardState.js";
import { useGameHistory } from "../../hooks/useGameHistory.js";
import { useForcedLandscape } from "../../hooks/useForcedLandscape.js";
import GameMenu from "./GameMenu.jsx";
import GameFormatMenu from "./GameFormatMenu.jsx";
import NewGameForm from "./NewGameForm.jsx";
import GameView from "./GameView.jsx";
import HistoryView from "./HistoryView.jsx";

const SCREEN_META = {
  menu: { title: "Beach Volleyball Scoreboard", subtitle: "Brevard Volleyball Club" },
  format: { title: "Select Game Type", subtitle: null },
  new: { title: "New Game", subtitle: null },
  active: { title: null, subtitle: null },
  history: { title: "Past Games", subtitle: null },
};

const BACK_MAP = { format: "menu", new: "format", active: "menu", history: "menu" };

export default function GameTrackingShell({ onBack }) {
  const scoreboard = useScoreboardState();
  const { history, addGame } = useGameHistory();
  const [screen, setScreen] = useState("menu");
  const [pendingFormat, setPendingFormat] = useState(null);

  function handleSelectFormat(format) {
    setPendingFormat(format);
    setScreen("new");
  }

  function handleStartGame(payload) {
    scoreboard.startGame(payload);
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
