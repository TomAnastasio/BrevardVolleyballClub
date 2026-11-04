import { useState } from "react";
import { Button, Card } from "@heroui/react";
import { defaultFinalTitle, FINAL_FORMATS, rulesLabel, titleFinalPool, unfinishedFinalistPools } from "../../../lib/queenOfCourt.js";
import { addFinal, deleteMatch, friendlyError, updatePoolFinalName } from "../../../lib/tournamentApi.js";
import { placeLabel, playerName, teamNames } from "../tournamentFormat.js";
import { inputClass } from "./TournamentDetailsForm.jsx";

// The pool's top 2, as finalist defaults (profile ids).
export function suggestedFinalists(pool) {
  return pool.standings.filter((r) => r.played).map((r) => r.id);
}

// Where a player from another pool finished, to tell finalists apart.
function otherPoolNote(division, profileId) {
  for (const pool of division.finalPools) {
    const row = pool.standings.find((r) => r.id === profileId);
    if (row) return ` (${pool.title}${row.played ? `, ${placeLabel(row.place)}` : ""})`;
  }
  return "";
}

function PoolFinal({ model, division, pool, isTitleFinal, collapsedWhenEmpty, reload }) {
  const { profilesById, tournament } = model;
  const suggestions = suggestedFinalists(pool);
  const [slots, setSlots] = useState(() => ({ a1: suggestions[0] ?? "", b1: suggestions[1] ?? "", a2: "", b2: "" }));
  const [format, setFormat] = useState("best_of_3");
  const [expanded, setExpanded] = useState(false);
  const [anyPool, setAnyPool] = useState(false);
  const [finalName, setFinalName] = useState(pool.finalTitle);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const title = pool.finalTitle;
  const name = (id) => playerName(profilesById, id);

  const chosen = [slots.a1, slots.a2, slots.b1, slots.b2];
  const complete = chosen.every(Boolean) && new Set(chosen).size === 4;
  const topTies = anyPool ? [] : pool.ties.filter((t) => t.place <= 2);
  const unfinished = unfinishedFinalistPools(pool, [slots.a1, slots.b1].filter(Boolean), division.finalPools);
  const poolIds = pool.standings.map((r) => r.id);

  async function handleAdd() {
    setBusy(true);
    setError("");
    try {
      const typed = finalName.trim();
      await updatePoolFinalName(pool.id, typed === defaultFinalTitle(pool) ? null : typed);
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

  async function handleRenameFinal(input) {
    const typed = input.value.trim();
    if (!typed) input.value = pool.finalTitle;
    if (!typed || typed === pool.finalTitle) return;
    setError("");
    try {
      await updatePoolFinalName(pool.id, typed === defaultFinalTitle(pool) ? null : typed);
      await reload();
    } catch (e) {
      console.error("Failed to rename final:", e);
      input.value = pool.finalTitle;
      setError(friendlyError(e, "Couldn't save the final's name."));
    }
  }

  // Back to this pool's players only: anyone from elsewhere makes way for
  // the suggested finalist.
  function handleAnyPool(checked) {
    setAnyPool(checked);
    if (checked) return;
    setSlots((s) => ({
      ...s,
      a1: poolIds.includes(s.a1) ? s.a1 : (suggestions[0] ?? ""),
      b1: poolIds.includes(s.b1) ? s.b1 : (suggestions[1] ?? ""),
    }));
  }

  const finalistOption = (r) => (
    <option key={r.id} value={r.id}>
      {name(r.id)}
      {r.played ? ` (${placeLabel(r.place)})` : ""}
    </option>
  );

  // This pool's players, as always; with "any pool" on, the rest of the
  // division too, minus anyone already picked in another slot.
  const finalistSelect = (key, label) => {
    const free = (id) => id === slots[key] || !chosen.includes(id);
    const others = division.entrants.filter((e) => !poolIds.includes(e.profile_id) && free(e.profile_id));
    return (
      <label className="flex flex-col gap-1 text-sm font-bold">
        {label}
        <select
          aria-label={`${division.name} ${title}: ${label}`}
          value={slots[key]}
          onChange={(e) => setSlots((s) => ({ ...s, [key]: e.target.value }))}
          className={`${inputClass} py-1`}
        >
          <option value="">Choose a player</option>
          {anyPool ? (
            <>
              <optgroup label="This pool">{pool.standings.filter((r) => free(r.id)).map(finalistOption)}</optgroup>
              <optgroup label="Other pools">
                {others.map((e) => (
                  <option key={e.id} value={e.profile_id}>
                    {name(e.profile_id)}
                    {otherPoolNote(division, e.profile_id)}
                  </option>
                ))}
              </optgroup>
            </>
          ) : (
            pool.standings.map(finalistOption)
          )}
        </select>
      </label>
    );
  };

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

  // Once a division has a final, other pools aren't assumed to have one:
  // they stay out of the way until an admin asks. None of this reaches the
  // public page, which only lists finals that exist.
  if (!series && collapsedWhenEmpty && !expanded) {
    return (
      <Card className="flex-row items-center justify-between gap-2 p-3">
        <p className="m-0 min-w-0 text-sm text-muted">{pool.title}: no final</p>
        <Button
          size="sm"
          variant="outline"
          onPress={() => setExpanded(true)}
          aria-label={`Set up a final for ${pool.title}`}
          className="flex-none font-bold"
        >
          Set up a final
        </Button>
      </Card>
    );
  }

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
          <label className="flex flex-col gap-1 text-sm font-bold">
            Name of this final
            <input
              defaultValue={title}
              maxLength={60}
              aria-label={`${division.name} ${title}: name`}
              onBlur={(e) => handleRenameFinal(e.target)}
              className={`${inputClass} py-1`}
            />
          </label>
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
          {unfinished.map((p) => (
            <p key={p.id} className="m-0 text-sm text-warning">
              {p.id === pool.id ? "This pool" : p.title} still has games to play.
            </p>
          ))}
          {topTies.map((t) => (
            <p key={t.place} className="m-0 text-sm text-warning">
              Tied for {placeLabel(t.place)}: {t.ids.map(name).join(", ")}. Mini game to 15 first, then pick the finalists.
            </p>
          ))}
          <label className="flex flex-col gap-1 text-sm font-bold">
            Name of this final
            <input
              value={finalName}
              maxLength={60}
              onChange={(e) => setFinalName(e.target.value)}
              aria-label={`${division.name} ${title}: name`}
              className={`${inputClass} py-1`}
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={anyPool}
              onChange={(e) => handleAnyPool(e.target.checked)}
              aria-label={`${division.name} ${title}: finalists from any pool`}
              className="h-5 w-5"
            />
            Finalists from any pool (they weren't this pool's top 2)
          </label>
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
          <Button variant="primary" onPress={handleAdd} isDisabled={busy || !complete || !finalName.trim()} className="font-bold">
            Set up {(finalName.trim() || title).toLowerCase()}
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
  const titlePool = titleFinalPool(division.finalPools);
  const anyFinal = division.finalPools.some((p) => p.final);
  return (
    <section className="flex flex-col gap-2">
      <h3 className="m-0 text-lg font-extrabold">{division.name}</h3>
      {division.finalPools.length === 0 && (
        <p className="m-0 text-sm text-muted">
          {roundOnePools > 1 ? "Build round 2 pools first (Pools & schedule)." : "No pools yet."}
        </p>
      )}
      {division.finalPools.map((pool) => (
        <PoolFinal
          key={pool.id}
          model={model}
          division={division}
          pool={pool}
          isTitleFinal={pool.id === titlePool.id}
          collapsedWhenEmpty={anyFinal && pool.id !== titlePool.id}
          reload={reload}
        />
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
        top pool's final (Gold) decides the Queen and the cash prize. If it ran differently on the day, finalists can come
        from any pool, and a pool doesn't need a final of its own. Setting up or scoring a final never changes the crowns;
        only Crown the winners does.
      </p>
      {model.divisions.map((d) => (
        <DivisionFinals key={d.id} model={model} division={d} reload={reload} />
      ))}
    </div>
  );
}
