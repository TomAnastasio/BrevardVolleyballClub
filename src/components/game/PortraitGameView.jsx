import { Button } from "@heroui/react";
import { colorForeground } from "../../lib/teamColors.js";
import { EditableTeamName, RosterAvatar } from "./TeamPanel.jsx";
import WinBanner from "./WinBanner.jsx";

// Upright phone layout for the live scoreboard (landscape keeps GameView):
// Team A on top, Team B below, each with its score, a full-width +1 in the
// team color and a −1 beside it. Adds a serve marker (whoever won the last
// rally) and, for beach, a "Switch sides" banner every 7 points.

function VolleyballIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M11.1 7.1a16.55 16.55 0 0 1 10.9 4" />
      <path d="M12 12a12.6 12.6 0 0 1-8.7 5" />
      <path d="M16.8 13.6a16.55 16.55 0 0 1-9 7.5" />
      <path d="M20.7 17a12.8 12.8 0 0 0-8.7-5 13.3 13.3 0 0 1 0-10" />
      <path d="M6.3 3.8a16.55 16.55 0 0 0 1.9 11.5" />
    </svg>
  );
}

function SwitchSidesBanner({ totalPoints, onDone }) {
  return (
    <div
      role="status"
      className="mx-3 mb-2 flex flex-none items-center gap-3 rounded-2xl bg-accent px-4 py-3 text-accent-foreground"
    >
      <span aria-hidden="true" className="text-2xl font-extrabold leading-none">
        ⇅
      </span>
      <div className="min-w-0 flex-1">
        <p className="m-0 font-extrabold">Switch sides</p>
        <p className="m-0 text-sm font-semibold opacity-75">{totalPoints} points played</p>
      </div>
      <Button size="sm" onPress={onDone} className="rounded-full bg-black px-4 font-extrabold text-accent">
        Done
      </Button>
    </div>
  );
}

function PortraitTeam({ side, score, names, fallbacks, roster, color, serving, winner, onInc, onDec, onNameCommit }) {
  const teamLabel = `Team ${side}`;

  const nameOrRoster = roster ? (
    <div className="flex flex-wrap items-center gap-1">
      {roster.map((player) => (
        <RosterAvatar key={player.id} player={player} size={34} />
      ))}
    </div>
  ) : (
    <div className="flex flex-wrap items-baseline">
      {names.map((name, i) => (
        <span key={i} className="flex items-baseline">
          <EditableTeamName
            id={`${side}-name-${i + 1}`}
            name={name}
            fallback={fallbacks[i]}
            label={`${teamLabel}, player ${i + 1} name, tap to edit`}
            onCommit={(next) => onNameCommit(i + 1, next)}
            fontSize="1.25rem"
            align="left"
          />
          {/* Kept with the first name so a wrapped second name lines up. */}
          {i < names.length - 1 && <span className="text-xl font-bold">&amp;</span>}
        </span>
      ))}
    </div>
  );

  return (
    <section
      aria-label={`${teamLabel} scoring panel`}
      className={`flex min-h-0 flex-1 flex-col px-3 transition-colors ${winner ? "bg-success/10" : ""}`}
    >
      <div className="flex min-h-0 flex-1 items-center justify-between gap-3 px-1">
        <div className="flex min-w-0 flex-col gap-2">
          {nameOrRoster}
          {serving && (
            <p className="m-0 flex items-center gap-2 px-2 text-xs font-bold tracking-wider text-accent">
              <VolleyballIcon />
              SERVING
            </p>
          )}
        </div>
        <span
          aria-live="polite"
          aria-atomic="true"
          style={{ fontSize: "clamp(4rem, 15vh, 9rem)" }}
          className="flex-none font-extrabold leading-none [font-variant-numeric:tabular-nums]"
        >
          {score}
        </span>
      </div>

      <div className="flex h-24 flex-none gap-2">
        <Button
          variant="primary"
          onPress={onInc}
          aria-label={`Add point to ${teamLabel}`}
          style={{
            "--button-bg": color,
            "--button-bg-hover": `color-mix(in oklab, ${color} 85%, black)`,
            "--button-bg-pressed": `color-mix(in oklab, ${color} 85%, black)`,
            "--button-fg": colorForeground(color),
          }}
          className="h-full min-h-0 flex-1 rounded-2xl text-5xl font-extrabold leading-none active:scale-96"
        >
          +1
        </Button>
        <Button
          variant="outline"
          onPress={onDec}
          aria-label={`Remove point from ${teamLabel}, fix a mistake`}
          className="h-full min-h-0 w-20 rounded-2xl border-2 border-danger text-2xl font-extrabold leading-none text-foreground active:scale-96"
        >
          −1
        </Button>
      </div>
    </section>
  );
}

export default function PortraitGameView({ scoreboard, onSaveGame }) {
  const {
    state,
    usesRoster,
    aWins,
    bWins,
    winnerName,
    showBanner,
    servingTeam,
    switchesSides,
    showSwitchBanner,
    switchIn,
    totalPoints,
    changeScore,
    setName,
    dismissBanner,
    dismissSwitch,
  } = scoreboard;

  const fallbacks = ["Player 1", "Player 2"];

  const team = (side) => {
    const key = side === "A" ? "a" : "b";
    return (
      <PortraitTeam
        side={side}
        score={state[key]}
        names={usesRoster ? null : side === "A" ? [state.nameA1, state.nameA2] : [state.nameB1, state.nameB2]}
        fallbacks={fallbacks}
        roster={usesRoster ? (side === "A" ? state.teamAPlayers : state.teamBPlayers) : null}
        color={side === "A" ? state.colorA : state.colorB}
        serving={servingTeam === key}
        winner={side === "A" ? aWins : bWins}
        onInc={() => changeScore(key, 1)}
        onDec={() => changeScore(key, -1)}
        onNameCommit={(slot, next) => setName(key, slot, next)}
      />
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col" style={{ paddingBottom: "calc(0.75rem + var(--safe-bottom))" }}>
      {showBanner && (
        <WinBanner winnerName={winnerName} onSaveGame={onSaveGame} onKeepPlaying={dismissBanner} className="mx-3 mb-2" />
      )}
      {showSwitchBanner && <SwitchSidesBanner totalPoints={totalPoints} onDone={dismissSwitch} />}

      {team("A")}

      <div
        aria-hidden="true"
        className="flex flex-none items-center gap-4 px-5 py-2 text-xs font-bold tracking-wider text-muted before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border"
      >
        <span>{switchesSides && !winnerName ? `BVC · SWITCH SIDES IN ${switchIn}` : "BVC"}</span>
      </div>

      {team("B")}
    </div>
  );
}
