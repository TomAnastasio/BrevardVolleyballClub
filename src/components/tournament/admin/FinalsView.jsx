import { useState } from "react";
import { Button, Card } from "@heroui/react";
import PlayerSearchField from "../../game/PlayerSearchField.jsx";
import { usePlayerDirectory } from "../../../hooks/usePlayerDirectory.js";
import { addFinalMatch, deleteMatch, friendlyError } from "../../../lib/tournamentApi.js";
import { playerName, teamNames } from "../tournamentFormat.js";
import { inputClass } from "./TournamentDetailsForm.jsx";

// Best pool finishers first, as finalist suggestions. With several pools
// there's no rule yet for comparing across pools (pending the organizer),
// so pool winners come first, then runners-up, in pool order.
export function suggestedFinalists(division) {
  const round = Math.max(1, ...division.pools.map((p) => p.round));
  const pools = division.pools.filter((p) => p.round === round);
  const byPlace = [];
  for (let place = 0; place < 9; place++) {
    for (const pool of pools) if (pool.standings[place]?.played) byPlace.push(pool.standings[place].id);
  }
  return byPlace;
}

function DivisionFinals({ model, division, directory, reload }) {
  const { profilesById, tournament } = model;
  const suggestions = suggestedFinalists(division);
  const [slots, setSlots] = useState(() => ({
    a1: suggestions[0] ?? "",
    b1: suggestions[1] ?? "",
    a2: null,
    b2: null,
    a2Name: "",
    b2Name: "",
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const chosen = [slots.a1, slots.a2, slots.b1, slots.b2];
  const complete = chosen.every(Boolean) && new Set(chosen).size === 4;

  async function handleAdd() {
    setBusy(true);
    setError("");
    try {
      await addFinalMatch({
        tournamentId: tournament.id,
        divisionId: division.id,
        sequence: division.finals.length + 1,
        a1: slots.a1,
        a2: slots.a2,
        b1: slots.b1,
        b2: slots.b2,
      });
      setSlots((s) => ({ ...s, a2: null, b2: null, a2Name: "", b2Name: "" }));
      await reload();
    } catch (e) {
      console.error("Failed to add final:", e);
      setError(friendlyError(e, "Couldn't add the final."));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id) {
    setBusy(true);
    setError("");
    try {
      await deleteMatch(id);
      await reload();
    } catch (e) {
      setError(friendlyError(e, e.message));
    } finally {
      setBusy(false);
    }
  }

  const finalistSelect = (key, label) => (
    <label className="flex flex-col gap-1 text-sm font-bold">
      {label}
      <select aria-label={`${division.name}: ${label}`} value={slots[key]} onChange={(e) => setSlots((s) => ({ ...s, [key]: e.target.value }))} className={`${inputClass} py-1`}>
        <option value="">Choose a player</option>
        {division.entrants.map((e) => (
          <option key={e.id} value={e.profile_id}>
            {playerName(profilesById, e.profile_id)}
            {suggestions.indexOf(e.profile_id) === 0 ? " (top seed)" : suggestions.indexOf(e.profile_id) === 1 ? " (2nd)" : ""}
          </option>
        ))}
      </select>
    </label>
  );

  const partnerField = (key, label) => (
    <div className="flex flex-col gap-1 text-sm font-bold">
      {label}
      <PlayerSearchField
        value={slots[`${key}Name`]}
        onChange={(name, _avatar, id) => setSlots((s) => ({ ...s, [`${key}Name`]: name, [key]: id }))}
        placeholder="Search any player"
        ariaLabel={`${division.name}: ${label}`}
        directory={directory}
        excludeIds={chosen.filter(Boolean)}
        inputClassName={`${inputClass} py-1`}
      />
    </div>
  );

  return (
    <section className="flex flex-col gap-2">
      <h3 className="m-0 text-lg font-extrabold">{division.name}</h3>
      {division.finals.map((m) => (
        <Card key={m.id} className="gap-1 p-3 text-sm">
          <p className="m-0 font-bold">Final {m.sequence}</p>
          <p className="m-0">
            {teamNames(profilesById, [m.a1, m.a2])} vs {teamNames(profilesById, [m.b1, m.b2])}
          </p>
          {m.status === "final" ? (
            <p className="m-0 text-muted">
              Final score {m.scoreA}–{m.scoreB}
            </p>
          ) : (
            <button type="button" onClick={() => handleDelete(m.id)} disabled={busy} className="self-start font-bold text-danger underline">
              Remove this final
            </button>
          )}
        </Card>
      ))}
      <Card className="gap-3 p-3">
        <p className="m-0 font-bold">Set up a final</p>
        {finalistSelect("a1", "Finalist 1")}
        {partnerField("a2", "Finalist 1's partner")}
        {finalistSelect("b1", "Finalist 2")}
        {partnerField("b2", "Finalist 2's partner")}
        {slots.a2Name && !slots.a2 && <p className="m-0 text-xs text-warning">Pick partner 1 from the list.</p>}
        {slots.b2Name && !slots.b2 && <p className="m-0 text-xs text-warning">Pick partner 2 from the list.</p>}
        <Button variant="primary" onPress={handleAdd} isDisabled={busy || !complete} className="font-bold">
          Add final
        </Button>
      </Card>
      {error && (
        <p role="alert" className="m-0 text-sm font-semibold text-red-400">
          {error}
        </p>
      )}
    </section>
  );
}

export default function FinalsView({ model, reload }) {
  const directory = usePlayerDirectory(true);
  return (
    <div className="flex flex-col gap-5 px-3 pb-8">
      <p className="m-0 rounded-lg bg-warning/10 p-2 text-xs text-warning">
        Who can be picked as a partner is still being confirmed with the organizer, so any player can be chosen. A
        partner without a profile can be added from Admin Panel → Add Manual Profile.
      </p>
      {model.divisions.map((d) => (
        <DivisionFinals key={d.id} model={model} division={d} directory={directory} reload={reload} />
      ))}
    </div>
  );
}
