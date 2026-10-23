import { useState } from "react";
import { Button } from "@heroui/react";
import { WIN_SCORE_BY_FORMAT } from "../../hooks/useScoreboardState.js";

const inputClass =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center text-2xl font-extrabold text-foreground focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-accent";

// For a game that just finished without the live scoreboard: type in the
// final score and it's saved exactly like a live game would be (dated now).
export default function FinalScoreScreen({ format, teamAName, teamBName, onSubmit }) {
  const [scoreA, setScoreA] = useState("");
  const [scoreB, setScoreB] = useState("");

  const winScore = WIN_SCORE_BY_FORMAT[format] ?? 21;
  const parsedA = Number(scoreA);
  const parsedB = Number(scoreB);
  const bothEntered = scoreA !== "" && scoreB !== "";
  const isValidPair =
    bothEntered &&
    Number.isInteger(parsedA) &&
    Number.isInteger(parsedB) &&
    parsedA >= 0 &&
    parsedB >= 0 &&
    Math.max(parsedA, parsedB) >= winScore &&
    Math.abs(parsedA - parsedB) >= 2;

  function handleSubmit() {
    if (!isValidPair) return;
    onSubmit({ a: parsedA, b: parsedB });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        <div className="flex items-start justify-center gap-4">
          <div className="flex flex-1 flex-col gap-2 text-center">
            <p className="m-0 break-words text-sm font-bold">{teamAName}</p>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              value={scoreA}
              onChange={(e) => setScoreA(e.target.value)}
              aria-label={`${teamAName} final score`}
              className={inputClass}
            />
          </div>
          <span aria-hidden="true" className="pt-7 text-xl font-bold text-muted">
            –
          </span>
          <div className="flex flex-1 flex-col gap-2 text-center">
            <p className="m-0 break-words text-sm font-bold">{teamBName}</p>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              value={scoreB}
              onChange={(e) => setScoreB(e.target.value)}
              aria-label={`${teamBName} final score`}
              className={inputClass}
            />
          </div>
        </div>

        {bothEntered && !isValidPair && (
          <p role="alert" className="text-center text-sm font-semibold text-red-400">
            Score must reach {winScore}, with at least a 2-point lead.
          </p>
        )}
      </div>

      <div className="flex-none p-3" style={{ paddingBottom: "calc(0.75rem + var(--safe-bottom))" }}>
        <Button
          variant="primary"
          onPress={handleSubmit}
          isDisabled={!isValidPair}
          className="min-h-14 w-full text-lg font-extrabold"
        >
          Save Game
        </Button>
      </div>
    </div>
  );
}
