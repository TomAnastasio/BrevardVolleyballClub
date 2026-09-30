import { useState } from "react";
import { useScoreboardState } from "../../hooks/useScoreboardState.js";
import { useGameHistory } from "../../hooks/useGameHistory.js";
import GameView from "./GameView.jsx";
import HistoryView from "./HistoryView.jsx";

function navBtnClass(active) {
  return (
    "flex-1 py-3 text-center text-[0.95rem] font-bold min-h-13 focus-visible:outline-[3px] focus-visible:outline-accent focus-visible:-outline-offset-[3px] " +
    (active ? "text-foreground shadow-[inset_0_3px_0_var(--color-accent)]" : "text-muted")
  );
}

export default function GameTrackingShell({ onBack }) {
  const scoreboard = useScoreboardState();
  const { history, addGame } = useGameHistory();
  const [tab, setTab] = useState("game");

  function handleSaveGame() {
    addGame({
      nameA: scoreboard.state.nameA,
      nameB: scoreboard.state.nameB,
      a: scoreboard.state.a,
      b: scoreboard.state.b,
    });
    scoreboard.resetScoresOnly();
    if (navigator.vibrate) navigator.vibrate(20);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header
        className="flex items-center gap-2 px-2 pb-1"
        style={{ paddingTop: "calc(0.5rem + var(--safe-top))" }}
      >
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to menu"
          className="rounded-lg px-2 py-2 font-bold focus-visible:outline-[3px] focus-visible:outline-accent focus-visible:outline-offset-2"
        >
          &lsaquo; Menu
        </button>
        <div className="flex-1 pr-12 text-center">
          <h1 className="m-0 text-[clamp(1rem,4vw,1.4rem)] font-bold">Beach Volleyball Scoreboard</h1>
          <p className="m-0 mt-0.5 text-sm text-muted">Brevard Volleyball Club</p>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col">
        {tab === "game" ? (
          <GameView scoreboard={scoreboard} onSaveGame={handleSaveGame} />
        ) : (
          <HistoryView history={history} />
        )}
      </main>

      <nav
        aria-label="Sections"
        className="flex flex-none border-t border-border"
        style={{ paddingBottom: "var(--safe-bottom)" }}
      >
        <button
          type="button"
          aria-current={tab === "game" ? "page" : undefined}
          onClick={() => setTab("game")}
          className={navBtnClass(tab === "game")}
        >
          <span aria-hidden="true">🏐</span> Game
        </button>
        <button
          type="button"
          aria-current={tab === "history" ? "page" : undefined}
          onClick={() => setTab("history")}
          className={navBtnClass(tab === "history")}
        >
          <span aria-hidden="true">🕘</span> History
        </button>
      </nav>
    </div>
  );
}
