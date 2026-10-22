import { useState } from "react";
import { Button, Card } from "@heroui/react";
import { FINAL_FORMATS, rulesLabel } from "../../../lib/queenOfCourt.js";
import { addFinal, deleteMatch, friendlyError } from "../../../lib/tournamentApi.js";
import { placeLabel, playerName, teamNames } from "../tournamentFormat.js";
import { inputClass } from "./TournamentDetailsForm.jsx";

// The pool's top 2, as finalist defaults (profile ids).
export function suggestedFinalists(pool) {
  return pool.standings.filter((r) => r.played).map((r) => r.id);
}

function PoolFinal({ model, division, pool, isTitleFinal, reload }) {
  const { profilesById, tournament } = model;
  const suggestions = suggestedFinalists(pool);
  const [slots, setSlots] = useState(() => ({ a1: suggestions[0] ?? "", b1: suggestions[1] ?? "", a2: "", b2: "" }));
  const [format, setFormat] = useState("best_of_3");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const title = pool.finalTitle;
  const name = (id) => playerName(profilesById, id);

  const chosen = [slots.a1, slots.a2, slots.b1, slots.b2];
  const complete = chosen.every(Boolean) && new Set(chosen).size === 4;
  const topTies = pool.ties.filter((t) => t.place <= 2);

  async function handleAdd() {
    setBusy(true);
    setError("");
    try {
      await addFinal({
        tournamentId: tournament.id,
        divisionId: division.id,
        pool,
        sets: FINAL_FORMATS[format].sets,
        ...slots,
      });
      await reload();
    } catch (e) {
      console.error("Failed to add final:", e);
      setError(friendlyError(e, "Couldn't add the final."));
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    setBusy(true);
    setError("");
    try {
      for (const { match } of pool.final.sets) await deleteMatch(match.id);
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
      <select
        aria-label={`${division.name} ${title}: ${label}`}
        value={slots[key]}
        onChange={(e) => setSlots((s) => ({ ...s, [key]: e.target.value }))}
        className={`${inputClass} py-1`}
      >
        <option value="">Choose a player</option>
        {pool.standings.map((r) => (
          <option key={r.id} value={r.id}>
            {name(r.id)}
            {r.played ? ` (${placeLabel(r.place)})` : ""}
          </option>
        ))}
      </select>
    </label>
  );

  // Partners: any player in the division (the organizer's rule).
  const partnerSelect = (key, label) => (
    <label className="flex flex-col gap-1 text-sm font-bold">
      {label}
      <select
        aria-label={`${division.name} ${title}: ${label}`}
        value={slots[key]}
        onChange={(e) => setSlots((s) => ({ ...s, [key]: e.target.value }))}
        className={`${inputClass} py-1`}
      >
        <option value="">Choose from {division.name}</option>
        {division.entrants
          .filter((e) => e.profile_id === slots[key] || !chosen.includes(e.profile_id))
          .map((e) => (
            <option key={e.id} value={e.profile_id}>
              {name(e.profile_id)}
            </option>
          ))}
      </select>
    </label>
  );

  const series = pool.final;
  return (
    <Card className="gap-3 p-3">
      <div className="flex flex-col gap-0.5">
        <p className="m-0 font-extrabold">{title}</p>
        <p className={`m-0 text-xs ${isTitleFinal ? "text-accent" : "text-muted"}`}>
          {isTitleFinal ? "Decides the Queen & Princess (title and cash prize)" : "Not eligible for the title or cash prize"}
        </p>
      </div>

      {series ? (
        <>
          <p className="m-0 text-sm">
            {teamNames(profilesById, [series.sets[0].match.a1, series.sets[0].match.a2])} vs{" "}
            {teamNames(profilesById, [series.sets[0].match.b1, series.sets[0].match.b2])}
          </p>
          <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm">
            {series.sets.map(({ match, notNeeded }) => (
              <li key={match.id} className="text-muted">
                Set {match.sequence} ({rulesLabel(match.rules)}):{" "}
                {match.status === "final" ? `${match.scoreA}–${match.scoreB}` : notNeeded ? "not needed" : "not played yet"}
              </li>
            ))}
          </ul>
          {series.winner && (
            <p className="m-0 text-sm font-bold text-success">
              Won by {name(series.winner === "a" ? series.sets[0].match.a1 : series.sets[0].match.b1)}'s team
            </p>
          )}
          {series.sets.every(({ match }) => match.status !== "final") && (
            <button type="button" onClick={handleRemove} disabled={busy} className="self-start text-sm font-bold text-danger underline">
              Remove this final (to change players or format)
            </button>
          )}
        </>
      ) : (
        <>
          {!pool.complete && <p className="m-0 text-sm text-warning">This pool still has games to play.</p>}
          {topTies.map((t) => (
            <p key={t.place} className="m-0 text-sm text-warning">
              Tied for {placeLabel(t.place)}: {t.ids.map(name).join(", ")}. Mini game to 15 first, then pick the finalists.
            </p>
          ))}
          {finalistSelect("a1", "Finalist 1")}
          {partnerSelect("a2", "Finalist 1's partner")}
          {finalistSelect("b1", "Finalist 2")}
          {partnerSelect("b2", "Finalist 2's partner")}
          <label className="flex flex-col gap-1 text-sm font-bold">
            Format
            <select value={format} onChange={(e) => setFormat(e.target.value)} className={`${inputClass} py-1`}>
              {Object.entries(FINAL_FORMATS).map(([key, f]) => (
                <option key={key} value={key}>
                  {f.label}
                </option>
              ))}
            </select>
            <span className="text-xs font-normal text-muted">
              Best 2 of 3 unless both teams agree to one set. Win by 2, no cap.
            </span>
          </label>
          <Button variant="primary" onPress={handleAdd} isDisabled={busy || !complete} className="font-bold">
            Set up {title.toLowerCase()}
          </Button>
        </>
      )}
      {error && (
        <p role="alert" className="m-0 text-sm font-semibold text-red-400">
          {error}
        </p>
      )}
    </Card>
  );
}

function DivisionFinals({ model, division, reload }) {
  const roundOnePools = division.pools.filter((p) => p.round === 1).length;
  // Finals from before finals were linked to a pool.
  const unlinked = division.finals.filter((m) => !m.poolId);
  return (
    <section className="flex flex-col gap-2">
      <h3 className="m-0 text-lg font-extrabold">{division.name}</h3>
      {division.finalPools.length === 0 && (
        <p className="m-0 text-sm text-muted">
          {roundOnePools > 1 ? "Build round 2 pools first (Pools & schedule)." : "No pools yet."}
        </p>
      )}
      {division.finalPools.map((pool, i) => (
        <PoolFinal key={pool.id} model={model} division={division} pool={pool} isTitleFinal={i === 0} reload={reload} />
      ))}
      {unlinked.map((m) => (
        <Card key={m.id} className="gap-1 p-3 text-sm">
          <p className="m-0 font-bold">Final {m.sequence}</p>
          <p className="m-0">
            {teamNames(model.profilesById, [m.a1, m.a2])} vs {teamNames(model.profilesById, [m.b1, m.b2])}
          </p>
          {m.status === "final" && (
            <p className="m-0 text-muted">
              Final score {m.scoreA}–{m.scoreB}
            </p>
          )}
        </Card>
      ))}
    </section>
  );
}

export default function FinalsView({ model, reload }) {
  return (
    <div className="flex flex-col gap-5 px-3 pb-8">
      <p className="m-0 rounded-lg bg-white/5 p-2 text-xs text-muted">
        The top 2 of each final pool play each other, each with a partner of their choice from their division. Only the
        top pool's final (Gold) decides the Queen and the cash prize.
      </p>
      {model.divisions.map((d) => (
        <DivisionFinals key={d.id} model={model} division={d} reload={reload} />
      ))}
    </div>
  );
}
