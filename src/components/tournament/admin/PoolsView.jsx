import { useState } from "react";
import { Button, Card } from "@heroui/react";
import {
  buildPoolSchedule,
  gamesPerPlayer,
  MAX_POOL_SIZE,
  MIN_POOL_SIZE,
  poolLabel,
  splitIntoPools,
} from "../../../lib/queenOfCourt.js";
import { friendlyError, savePools, updatePoolCourt } from "../../../lib/tournamentApi.js";
import { playerName } from "../tournamentFormat.js";
import { inputClass } from "./TournamentDetailsForm.jsx";

function DivisionPools({ model, division, reload }) {
  const { profilesById, tournament } = model;
  const anyCheckedIn = division.entrants.some((e) => e.checked_in);
  const [checkedInOnly, setCheckedInOnly] = useState(anyCheckedIn);
  const [targetSize, setTargetSize] = useState(4);
  const [method, setMethod] = useState("elo");
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const eligible = division.entrants.filter((e) => !checkedInOnly || e.checked_in);
  const current = division.pools.filter((p) => p.round === 1);
  const scoredGames = current.flatMap((p) => p.matches).filter((m) => m.status === "final").length;
  const nameOf = (e) => playerName(profilesById, e.profile_id);

  function generate() {
    setError("");
    setSaved(false);
    const players = eligible.map((e) => {
      const p = profilesById.get(e.profile_id);
      return { ...e, name: nameOf(e), elo: p?.elo_games_played ? p.elo_rating : null };
    });
    const pools = splitIntoPools(players, { targetSize, method });
    if (!pools.length) {
      setError(`Need at least ${MIN_POOL_SIZE} players to make a pool.`);
      setPreview(null);
      return;
    }
    setPreview(pools);
  }

  function movePlayer(fromPool, entrantId, toPool) {
    setPreview((prev) => {
      const next = prev.map((p) => [...p]);
      const idx = next[fromPool].findIndex((e) => e.id === entrantId);
      const [player] = next[fromPool].splice(idx, 1);
      next[toPool].push(player);
      return next;
    });
  }

  const badSizes = preview?.some((p) => p.length < MIN_POOL_SIZE || p.length > MAX_POOL_SIZE);

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      await savePools({
        tournamentId: tournament.id,
        divisionId: division.id,
        round: 1,
        pools: preview,
        courts: current.map((p) => p.court),
      });
      setPreview(null);
      setSaved(true);
      await reload();
    } catch (e) {
      console.error("Failed to save pools:", e);
      setError(friendlyError(e, "Couldn't save pools. Please try again."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="flex flex-col gap-2">
      <h3 className="m-0 text-lg font-extrabold">{division.name}</h3>

      {current.length > 0 && !preview && (
        <div className="flex flex-col gap-2">
          {current.map((pool) => (
            <Card key={pool.id} className="gap-2 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="m-0 font-bold">
                  Pool {pool.label} · {pool.players.length} players · {pool.matches.length} games
                </p>
              </div>
              <p className="m-0 text-sm text-muted">{pool.players.map(nameOf).join(", ")}</p>
              <input
                defaultValue={pool.court || ""}
                placeholder="Court (optional), e.g. Court 1"
                aria-label={`Court for pool ${pool.label}`}
                onBlur={(e) => {
                  if ((e.target.value || null) !== (pool.court || null)) {
                    updatePoolCourt(pool.id, e.target.value.trim())
                      .then(reload)
                      .catch(() => setError("Couldn't save the court."));
                  }
                }}
                className={`${inputClass} py-1 text-sm`}
              />
            </Card>
          ))}
        </div>
      )}

      <Card className="gap-3 p-3">
        <p className="m-0 font-bold">{current.length ? "Rebuild pools" : "Build pools"}</p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={checkedInOnly} onChange={(e) => setCheckedInOnly(e.target.checked)} className="h-5 w-5" />
          Checked-in players only ({division.entrants.filter((e) => e.checked_in).length} of {division.entrants.length})
        </label>
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1 text-sm font-bold">
            Pool size
            <select value={targetSize} onChange={(e) => setTargetSize(Number(e.target.value))} className={`${inputClass} py-1`}>
              {[4, 5, 6, 7, 8].map((n) => (
                <option key={n} value={n}>
                  About {n} ({gamesPerPlayer(n)} games each)
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-bold">
            Seeding
            <select value={method} onChange={(e) => setMethod(e.target.value)} className={`${inputClass} py-1`}>
              <option value="elo">Balanced by Elo</option>
              <option value="random">Random</option>
            </select>
          </label>
        </div>
        <Button variant="secondary" onPress={generate} isDisabled={eligible.length === 0} className="font-bold">
          {preview ? "Generate again" : "Preview pools"} ({eligible.length} players)
        </Button>
        {scoredGames > 0 && (
          <p className="m-0 text-sm text-warning">
            {scoredGames} game{scoredGames === 1 ? " has" : "s have"} a score, so these pools can't be replaced.
          </p>
        )}
      </Card>

      {preview && (
        <Card className="gap-3 border border-accent/40 p-3">
          <p className="m-0 font-bold">Preview — not saved yet</p>
          {preview.map((pool, i) => (
            <div key={i} className="flex flex-col gap-1">
              <p className="m-0 text-sm font-bold">
                Pool {poolLabel(i)} · {pool.length} players
                {pool.length >= MIN_POOL_SIZE && pool.length <= MAX_POOL_SIZE
                  ? ` · ${buildPoolSchedule(pool.length).length} games`
                  : ` · needs ${MIN_POOL_SIZE}–${MAX_POOL_SIZE} players`}
              </p>
              <ul className="m-0 flex list-none flex-col gap-1 p-0">
                {pool.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate">
                      {e.name}
                      <span className="text-muted"> · {e.elo ?? "unrated"}</span>
                    </span>
                    {preview.length > 1 && (
                      <select
                        value={i}
                        onChange={(ev) => movePlayer(i, e.id, Number(ev.target.value))}
                        aria-label={`Move ${e.name} to pool`}
                        className="rounded border border-white/10 bg-white/5 px-1 text-xs"
                      >
                        {preview.map((_, j) => (
                          <option key={j} value={j}>
                            Pool {poolLabel(j)}
                          </option>
                        ))}
                      </select>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="flex gap-2">
            <Button variant="outline" onPress={() => setPreview(null)} className="flex-1 font-bold">
              Cancel
            </Button>
            <Button variant="primary" onPress={handleSave} isDisabled={saving || badSizes || scoredGames > 0} className="flex-1 font-bold">
              {saving ? "Saving…" : current.length ? "Replace pools" : "Save pools"}
            </Button>
          </div>
        </Card>
      )}

      {saved && (
        <p role="status" className="m-0 text-sm font-semibold text-success">
          ✓ Pools and game order saved
        </p>
      )}
      {error && (
        <p role="alert" className="m-0 text-sm font-semibold text-red-400">
          {error}
        </p>
      )}
    </section>
  );
}

export default function PoolsView({ model, reload }) {
  return (
    <div className="flex flex-col gap-5 px-3 pb-8">
      <p className="m-0 rounded-lg bg-warning/10 p-2 text-xs text-warning">
        Pool size, seeding and the standings tiebreak are provisional until the organizer confirms the rules. Round 2
        isn't built yet.
      </p>
      {model.divisions.map((d) => (
        <DivisionPools key={d.id} model={model} division={d} reload={reload} />
      ))}
    </div>
  );
}
