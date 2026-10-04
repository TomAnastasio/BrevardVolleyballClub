import { useState } from "react";
import { Button } from "@heroui/react";
import { WIN_SCORE_BY_FORMAT } from "../../hooks/useScoreboardState.js";

function pad2(n) {
  return n < 10 ? "0" + n : String(n);
}

function todayISODate() {
  const now = new Date();
  return now.getFullYear() + "-" + pad2(now.getMonth() + 1) + "-" + pad2(now.getDate());
}

const inputClass =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center text-2xl font-extrabold text-foreground focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-accent";

export default function LogPastGameScoreScreen({ format, teamAName, teamBName, onSubmit, submitting, error }) {
  const [scoreA, setScoreA] = useState("");
  const [scoreB, setScoreB] = useState("");
  const [date, setDate] = useState(todayISODate());

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
  const canSubmit = isValidPair && Boolean(date) && !submitting;

  function handleSubmit() {
    if (!canSubmit) return;
    onSubmit({ a: parsedA, b: parsedB, date });
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

        <label className="flex flex-col gap-1">
          <span className="text-center text-sm font-semibold text-muted">Date played</span>
          <input
            type="date"
            value={date}
            max={todayISODate()}
            onChange={(e) => setDate(e.target.value)}
            className={`${inputClass} text-base font-bold`}
          />
        </label>
      </div>

      <div className="flex-none p-3" style={{ paddingBottom: "calc(0.75rem + var(--safe-bottom))" }}>
        {error && (
          <p role="alert" className="mb-2 text-center text-sm font-semibold text-red-400">
            {error}
          </p>
        )}
        <Button
          variant="primary"
          onPress={handleSubmit}
          isDisabled={!canSubmit}
          className="min-h-14 w-full text-lg font-extrabold"
        >
          {submitting ? "Saving…" : "Submit Game"}
        </Button>
      </div>
    </div>
  );
}
