import { useEffect, useState } from "react";
import { Button, Card } from "@heroui/react";
import { completeTournament, fetchCostumeTally, friendlyError } from "../../../lib/tournamentApi.js";
import { playerName } from "../tournamentFormat.js";
import { inputClass } from "./TournamentDetailsForm.jsx";

// Default Queen/Princess from the division's Gold final (the first final
// pool): the winning finalist, then the losing one. The admin confirms.
function defaultWinners(division) {
  const existingQueen = division.entrants.find((e) => e.title === "queen");
  const existingPrincess = division.entrants.find((e) => e.title === "princess");
  if (existingQueen || existingPrincess) {
    return { queen: existingQueen?.id ?? "", princess: existingPrincess?.id ?? "" };
  }
  const series = division.finalPools[0]?.final;
  if (!series?.winner) return { queen: "", princess: "" };
  const { a1, b1 } = series.sets[0].match;
  const [winner, loser] = series.winner === "a" ? [a1, b1] : [b1, a1];
  const entrantFor = (pid) => division.entrants.find((e) => e.profile_id === pid);
  return { queen: entrantFor(winner)?.id ?? "", princess: entrantFor(loser)?.id ?? "" };
}

export default function ResultsView({ model, onDone }) {
  const { divisions, profilesById, tournament } = model;
  const allEntrants = divisions.flatMap((d) => d.entrants);
  const [picks, setPicks] = useState(() => Object.fromEntries(divisions.map((d) => [d.id, defaultWinners(d)])));
  const [costume, setCostume] = useState(() => allEntrants.find((e) => e.costume_winner)?.id ?? "");
  const [tally, setTally] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchCostumeTally(tournament.id)
      .then((t) => {
        setTally(t);
        // Default to the most votes, unless a winner is already saved.
        const top = [...t.entries()].sort((a, b) => b[1] - a[1])[0];
        if (top) setCostume((c) => c || top[0]);
      })
      .catch((e) => console.error("Failed to load costume votes:", e));
  }, [tournament.id]);

  const invalid = divisions.some((d) => picks[d.id].queen && picks[d.id].queen === picks[d.id].princess);
  const name = (e) => `${playerName(profilesById, e.profile_id)}${e.is_junior ? " (Jr)" : ""}`;
  const juniorPicks = divisions.flatMap((d) =>
    [picks[d.id].queen, picks[d.id].princess].map((id) => d.entrants.find((e) => e.id === id)).filter((e) => e?.is_junior),
  );

  async function handleFinish() {
    setSaving(true);
    setError("");
    const results = divisions.flatMap((d) => [
      ...(picks[d.id].queen ? [{ entrantId: picks[d.id].queen, title: "queen", place: 1 }] : []),
      ...(picks[d.id].princess ? [{ entrantId: picks[d.id].princess, title: "princess", place: 2 }] : []),
    ]);
    try {
      await completeTournament(tournament.id, results, costume || null);
      onDone();
    } catch (e) {
      console.error("Failed to complete tournament:", e);
      setError(friendlyError(e, "Couldn't save the results. Please try again."));
      setSaving(false);
    }
  }

  const byVotes = [...allEntrants].sort((a, b) => (tally?.get(b.id) ?? 0) - (tally?.get(a.id) ?? 0));

  return (
    <div className="flex flex-col gap-4 px-3 pb-8">
      <p className="m-0 text-sm text-muted">
        Winners get a crown or tiara on their player profile. You can come back and fix this any time.
      </p>
      {divisions.map((d) => (
        <Card key={d.id} className="gap-3 p-3">
          <p className="m-0 font-extrabold">{d.name}</p>
          {[
            ["queen", "👑 Queen"],
            ["princess", "👸 Princess"],
          ].map(([key, label]) => (
            <label key={key} className="flex flex-col gap-1 text-sm font-bold">
              {label}
              <select
                aria-label={`${d.name} ${key}`}
                value={picks[d.id][key]}
                onChange={(e) => setPicks((p) => ({ ...p, [d.id]: { ...p[d.id], [key]: e.target.value } }))}
                className={`${inputClass} py-1`}
              >
                <option value="">Nobody</option>
                {d.entrants.map((e) => (
                  <option key={e.id} value={e.id}>
                    {name(e)}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </Card>
      ))}

      <Card className="gap-3 p-3">
        <p className="m-0 font-extrabold">🎃 Best costume</p>
        <label className="flex flex-col gap-1 text-sm font-bold">
          Winner
          <select aria-label="Best costume" value={costume} onChange={(e) => setCostume(e.target.value)} className={`${inputClass} py-1`}>
            <option value="">Nobody</option>
            {byVotes.map((e) => (
              <option key={e.id} value={e.id}>
                {playerName(profilesById, e.profile_id)}
                {tally ? ` (${tally.get(e.id) ?? 0} vote${tally.get(e.id) === 1 ? "" : "s"})` : ""}
              </option>
            ))}
          </select>
        </label>
      </Card>

      {juniorPicks.length > 0 && (
        <p className="m-0 text-sm font-semibold text-warning">
          {juniorPicks.map(name).join(", ")}: juniors can win the title but aren't eligible for cash prizes.
        </p>
      )}
      {invalid && <p className="m-0 text-sm font-semibold text-warning">Queen and Princess must be different players.</p>}
      {error && (
        <p role="alert" className="m-0 text-sm font-semibold text-red-400">
          {error}
        </p>
      )}
      <Button variant="primary" onPress={handleFinish} isDisabled={saving || invalid} className="min-h-12 font-extrabold">
        {saving ? "Saving…" : tournament.status === "complete" ? "Save results" : "Crown winners & finish tournament"}
      </Button>
    </div>
  );
}
