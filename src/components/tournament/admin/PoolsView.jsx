import { useState } from "react";
import { Button, Card } from "@heroui/react";
import {
  buildPoolSchedule,
  gamesPerPlayer,
  MAX_POOL_SIZE,
  MIN_POOL_SIZE,
  planRound2,
  poolLabel,
  poolRules,
  rulesLabel,
  splitIntoPools,
  tierName,
} from "../../../lib/queenOfCourt.js";
import { friendlyError, savePools, updatePoolCourt } from "../../../lib/tournamentApi.js";
import { playerName } from "../tournamentFormat.js";
import { inputClass } from "./TournamentDetailsForm.jsx";

function tournamentRules(t) {
  return { winScore: t.win_score, winByTwo: t.win_by_two, pointCap: t.point_cap };
}

function seedInfo(e) {
  const parts = [];
  if (e.avp != null) parts.push(`AVP #${e.avp}`);
  if (e.truvolley != null) parts.push(`TruVolley ${e.truvolley}`);
  parts.push(e.elo != null ? `Elo ${e.elo}` : "unrated");
  if (e.is_junior) parts.push("Jr");
  return parts.join(" · ");
}

function SavedPools({ pools, nameOf, setError, reload }) {
  return (
    <div className="flex flex-col gap-2">
      {pools.map((pool) => (
        <Card key={pool.id} className="gap-2 p-3">
          <p className="m-0 font-bold">
            {pool.title} · {pool.players.length} players · {pool.matches.length} games
          </p>
          {pool.matches[0] && <p className="m-0 text-xs text-muted">Games {rulesLabel(pool.matches[0].rules)}</p>}
          <p className="m-0 text-sm text-muted">{pool.players.map(nameOf).join(", ")}</p>
          <input
            defaultValue={pool.court || ""}
            placeholder="Court (optional), e.g. Court 1"
            aria-label={`Court for ${pool.title}`}
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
  );
}

// An unsaved set of pools the admin can adjust by moving players, then save.
function PoolPreview({ preview, setPreview, labels, fallbackRules, notes, saving, blocked, saveLabel, onSave }) {
  const badSizes = preview.some((p) => p.length < MIN_POOL_SIZE || p.length > MAX_POOL_SIZE);

  function movePlayer(fromPool, entrantId, toPool) {
    setPreview((prev) => {
      const next = prev.map((p) => [...p]);
      const idx = next[fromPool].findIndex((e) => e.id === entrantId);
      const [player] = next[fromPool].splice(idx, 1);
      next[toPool].push(player);
      return next;
    });
  }

  return (
    <Card className="gap-3 border border-accent/40 p-3">
      <p className="m-0 font-bold">Preview — not saved yet</p>
      {notes}
      {preview.map((pool, i) => (
        <div key={i} className="flex flex-col gap-1">
          <p className="m-0 text-sm font-bold">
            {labels[i]} · {pool.length} players
            {pool.length >= MIN_POOL_SIZE && pool.length <= MAX_POOL_SIZE
              ? ` · ${buildPoolSchedule(pool.length).length} games ${rulesLabel(poolRules(pool.length, fallbackRules))}`
              : ` · needs ${MIN_POOL_SIZE}–${MAX_POOL_SIZE} players`}
          </p>
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {pool.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate">
                  {e.name}
                  <span className="text-muted"> · {e.detail}</span>
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
                        {labels[j]}
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
        <Button variant="primary" onPress={onSave} isDisabled={saving || badSizes || blocked} className="flex-1 font-bold">
          {saving ? "Saving…" : saveLabel}
        </Button>
      </div>
    </Card>
  );
}

function usePoolSaver(reload) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  async function save(args, onSaved) {
    setSaving(true);
    setError("");
    try {
      await savePools(args);
      onSaved();
      setSaved(true);
      await reload();
    } catch (e) {
      console.error("Failed to save pools:", e);
      setError(friendlyError(e, "Couldn't save pools. Please try again."));
    } finally {
      setSaving(false);
    }
  }
  return { saving, error, setError, saved, setSaved, save };
}

function Messages({ saved, error }) {
  return (
    <>
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
    </>
  );
}

function RoundOne({ model, division, reload, nameOf }) {
  const { profilesById, tournament } = model;
  const anyCheckedIn = division.entrants.some((e) => e.checked_in);
  const [checkedInOnly, setCheckedInOnly] = useState(anyCheckedIn);
  const [targetSize, setTargetSize] = useState(5);
  const [method, setMethod] = useState("ranked");
  const [preview, setPreview] = useState(null);
  const { saving, error, setError, saved, setSaved, save } = usePoolSaver(reload);

  const eligible = division.entrants.filter((e) => !checkedInOnly || e.checked_in);
  const current = division.pools.filter((p) => p.round === 1);
  const scoredGames = current.flatMap((p) => p.matches).filter((m) => m.status === "final").length;
  const tooSmall = eligible.length < division.min_players;

  function generate() {
    setError("");
    setSaved(false);
    const players = eligible.map((e) => {
      const p = profilesById.get(e.profile_id);
      const row = {
        ...e,
        name: nameOf(e),
        avp: e.avp_rank,
        truvolley: e.truvolley_score == null ? null : Number(e.truvolley_score),
        elo: p?.elo_games_played ? p.elo_rating : null,
      };
      return { ...row, detail: seedInfo(row) };
    });
    const pools = splitIntoPools(players, { targetSize, method });
    if (!pools.length) {
      setError(`Need at least ${MIN_POOL_SIZE} players to make a pool.`);
      setPreview(null);
      return;
    }
    setPreview(pools);
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="m-0 text-sm font-bold uppercase tracking-wide text-muted">Round 1</p>
      {current.length > 0 && !preview && <SavedPools pools={current} nameOf={nameOf} setError={setError} reload={reload} />}

      <Card className="gap-3 p-3">
        <p className="m-0 font-bold">{current.length ? "Rebuild round 1 pools" : "Build round 1 pools"}</p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={checkedInOnly} onChange={(e) => setCheckedInOnly(e.target.checked)} className="h-5 w-5" />
          Checked-in players only ({division.entrants.filter((e) => e.checked_in).length} of {division.entrants.length})
        </label>
        {tooSmall && eligible.length > 0 && (
          <p className="m-0 text-sm text-warning">
            Only {eligible.length} player{eligible.length === 1 ? "" : "s"} — under {division.min_players}, divisions merge
            into the next level up or down. Move them on Players & check-in.
          </p>
        )}
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1 text-sm font-bold">
            Pool size
            <select value={targetSize} onChange={(e) => setTargetSize(Number(e.target.value))} className={`${inputClass} py-1`}>
              {[5, 4].map((n) => (
                <option key={n} value={n}>
                  Mostly {n}s ({gamesPerPlayer(n)} games to {poolRules(n).winScore})
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-bold">
            Seeding (snake)
            <select value={method} onChange={(e) => setMethod(e.target.value)} className={`${inputClass} py-1`}>
              <option value="ranked">AVP → TruVolley → Elo</option>
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
        <PoolPreview
          preview={preview}
          setPreview={setPreview}
          labels={preview.map((_, i) => `Pool ${poolLabel(i)}`)}
          fallbackRules={tournamentRules(tournament)}
          saving={saving}
          blocked={scoredGames > 0}
          saveLabel={current.length ? "Replace pools" : "Save pools"}
          onSave={() =>
            save(
              {
                tournamentId: tournament.id,
                divisionId: division.id,
                round: 1,
                pools: preview,
                courts: current.map((p) => p.court),
                fallbackRules: tournamentRules(tournament),
              },
              () => setPreview(null),
            )
          }
        />
      )}
      <Messages saved={saved} error={error} />
    </div>
  );
}

function RoundTwo({ model, division, reload, nameOf }) {
  const { tournament } = model;
  const [preview, setPreview] = useState(null);
  const [plan, setPlan] = useState(null);
  const { saving, error, setError, saved, setSaved, save } = usePoolSaver(reload);

  const roundOne = division.pools.filter((p) => p.round === 1);
  const current = division.pools.filter((p) => p.round === 2);
  if (roundOne.length < 2) {
    return roundOne.length === 1 ? (
      <p className="m-0 text-sm text-muted">One pool, so there's no round 2: its top 2 go straight to the final.</p>
    ) : null;
  }
  const r1Games = roundOne.flatMap((p) => p.matches);
  const r1Scored = r1Games.filter((m) => m.status === "final").length;
  const scoredGames = current.flatMap((p) => p.matches).filter((m) => m.status === "final").length;
  const entrantByProfile = new Map(division.entrants.map((e) => [e.profile_id, e]));
  const nameById = (id) => nameOf(entrantByProfile.get(id) || { profile_id: id });

  function generate() {
    setError("");
    setSaved(false);
    const next = planRound2(roundOne);
    setPlan(next);
    setPreview(
      next.tiers.map((tier) =>
        tier.map((r) => {
          const e = entrantByProfile.get(r.id);
          return { ...e, name: nameById(r.id), detail: `${r.wins}–${r.losses}, ${r.pointsAgainst} against${e?.is_junior ? " · Jr" : ""}` };
        }),
      ),
    );
  }

  const notes = plan && (
    <>
      <p className="m-0 text-xs text-muted">
        {plan.method === "place"
          ? "Each round 1 pool sends the same places to each tier (e.g. top 2 of each pool to Gold)."
          : "Everyone ranked together by games won, then fewest points against (per game)."}{" "}
        Round 1 results don't carry over.
      </p>
      {plan.ties.map((t) => (
        <p key={`${t.tier}-${t.ids.join()}`} className="m-0 text-sm text-warning">
          Tied at the {tierName(t.tier)}/{tierName(t.tier + 1)} line: {t.ids.map(nameById).join(", ")}. They play a mini
          game to 15 (partner of their choice from the pool); move the winner up if needed.
        </p>
      ))}
    </>
  );

  return (
    <div className="flex flex-col gap-2">
      <p className="m-0 text-sm font-bold uppercase tracking-wide text-muted">Round 2</p>
      {current.length > 0 && !preview && <SavedPools pools={current} nameOf={nameOf} setError={setError} reload={reload} />}
      <Card className="gap-3 p-3">
        <p className="m-0 font-bold">{current.length ? "Rebuild round 2 pools" : "Build round 2 pools"}</p>
        <p className="m-0 text-sm text-muted">
          {r1Scored < r1Games.length
            ? `Available once every round 1 game is scored (${r1Scored} of ${r1Games.length} so far).`
            : `Round 1 is done. Players move into ${roundOne.map((_, i) => tierName(i)).join(", ")} pools.`}
        </p>
        <Button variant="secondary" onPress={generate} isDisabled={r1Scored < r1Games.length} className="font-bold">
          {preview ? "Start over" : "Preview round 2"}
        </Button>
        {scoredGames > 0 && (
          <p className="m-0 text-sm text-warning">
            {scoredGames} round 2 game{scoredGames === 1 ? " has" : "s have"} a score, so these pools can't be replaced.
          </p>
        )}
      </Card>
      {preview && (
        <PoolPreview
          preview={preview}
          setPreview={setPreview}
          labels={preview.map((_, i) => `${tierName(i)} pool`)}
          fallbackRules={tournamentRules(tournament)}
          notes={notes}
          saving={saving}
          blocked={scoredGames > 0}
          saveLabel={current.length ? "Replace round 2" : "Save round 2"}
          onSave={() =>
            save(
              {
                tournamentId: tournament.id,
                divisionId: division.id,
                round: 2,
                pools: preview,
                labels: preview.map((_, i) => tierName(i)),
                courts: roundOne.map((p) => p.court),
                fallbackRules: tournamentRules(tournament),
              },
              () => {
                setPreview(null);
                setPlan(null);
              },
            )
          }
        />
      )}
      <Messages saved={saved} error={error} />
    </div>
  );
}

function DivisionPools({ model, division, reload }) {
  const nameOf = (e) => playerName(model.profilesById, e.profile_id);
  return (
    <section className="flex flex-col gap-3">
      <h3 className="m-0 text-lg font-extrabold">{division.name}</h3>
      <RoundOne model={model} division={division} reload={reload} nameOf={nameOf} />
      <RoundTwo model={model} division={division} reload={reload} nameOf={nameOf} />
    </section>
  );
}

export default function PoolsView({ model, reload }) {
  return (
    <div className="flex flex-col gap-6 px-3 pb-8">
      <p className="m-0 rounded-lg bg-white/5 p-2 text-xs text-muted">
        Pools of 4 play 3 games {rulesLabel(poolRules(4))}; pools of 5 play 4 games {rulesLabel(poolRules(5))}. Ranking:
        games won, then fewest points against, then a mini game to 15. With 4 courts, a pool without a court sits out
        and refs.
      </p>
      {model.divisions.map((d) => (
        <DivisionPools key={d.id} model={model} division={d} reload={reload} />
      ))}
    </div>
  );
}
