import { useState } from "react";
import { Button, Card } from "@heroui/react";
import { completeTournament, friendlyError } from "../../../lib/tournamentApi.js";
import { playerName } from "../tournamentFormat.js";
import { suggestedFinalists } from "./FinalsView.jsx";
import { inputClass } from "./TournamentDetailsForm.jsx";

// Default Queen/Princess from the division's scored final: the winning
// side's best pool finisher, then the losing side's. The admin confirms.
function defaultWinners(division) {
  const existingQueen = division.entrants.find((e) => e.title === "queen");
  const existingPrincess = division.entrants.find((e) => e.title === "princess");
  if (existingQueen || existingPrincess) {
    return { queen: existingQueen?.id ?? "", princess: existingPrincess?.id ?? "" };
  }
  const final = [...division.finals].reverse().find((m) => m.status === "final");
  if (!final) return { queen: "", princess: "" };
  const order = suggestedFinalists(division);
  const rank = (pid) => (order.indexOf(pid) === -1 ? 99 : order.indexOf(pid));
  const entrantFor = (pid) => division.entrants.find((e) => e.profile_id === pid);
  const pick = (ids) => ids.filter(entrantFor).sort((x, y) => rank(x) - rank(y))[0];
  const winners = final.scoreA > final.scoreB ? [final.a1, final.a2] : [final.b1, final.b2];
  const losers = final.scoreA > final.scoreB ? [final.b1, final.b2] : [final.a1, final.a2];
  return { queen: entrantFor(pick(winners))?.id ?? "", princess: entrantFor(pick(losers))?.id ?? "" };
}

export default function ResultsView({ model, onDone }) {
  const { divisions, profilesById, tournament } = model;
  const [picks, setPicks] = useState(() => Object.fromEntries(divisions.map((d) => [d.id, defaultWinners(d)])));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const invalid = divisions.some((d) => picks[d.id].queen && picks[d.id].queen === picks[d.id].princess);

  async function handleFinish() {
    setSaving(true);
    setError("");
    const results = divisions.flatMap((d) => [
      ...(picks[d.id].queen ? [{ entrantId: picks[d.id].queen, title: "queen", place: 1 }] : []),
      ...(picks[d.id].princess ? [{ entrantId: picks[d.id].princess, title: "princess", place: 2 }] : []),
    ]);
    try {
      await completeTournament(tournament.id, results);
      onDone();
    } catch (e) {
      console.error("Failed to complete tournament:", e);
      setError(friendlyError(e, "Couldn't save the results. Please try again."));
      setSaving(false);
    }
  }

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
                value={picks[d.id][key]}
                onChange={(e) => setPicks((p) => ({ ...p, [d.id]: { ...p[d.id], [key]: e.target.value } }))}
                className={`${inputClass} py-1`}
              >
                <option value="">Nobody</option>
                {d.entrants.map((e) => (
                  <option key={e.id} value={e.id}>
                    {playerName(profilesById, e.profile_id)}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </Card>
      ))}
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
