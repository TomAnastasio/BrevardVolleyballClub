import { useState } from "react";
import { Button, Card } from "@heroui/react";
import LoadingMeteor from "../../LoadingMeteor.jsx";
import MenuCard from "../../game/MenuCard.jsx";
import { useTournament } from "../../../hooks/useTournament.js";
import { deleteDraftTournament, friendlyError, updateTournament } from "../../../lib/tournamentApi.js";
import { STATUS_LABELS } from "../tournamentFormat.js";
import TournamentDetailsForm from "./TournamentDetailsForm.jsx";
import EntrantsView from "./EntrantsView.jsx";
import RosterImportView from "./RosterImportView.jsx";
import PoolsView from "./PoolsView.jsx";
import FinalsView from "./FinalsView.jsx";
import ResultsView from "./ResultsView.jsx";

const SECTION_TITLES = {
  details: "Details & rules",
  players: "Players & check-in",
  import: "Import registrations",
  pools: "Pools & schedule",
  finals: "Finals",
  results: "Crown the winners",
};

// Pooled players who haven't checked in, per division. Starting the
// tournament is blocked until pools only contain checked-in players.
export function poolProblems(model) {
  const problems = [];
  for (const d of model.divisions) {
    const pooled = d.pools.filter((p) => p.round === 1).flatMap((p) => p.players);
    if (d.entrants.length > 0 && pooled.length === 0) problems.push(`${d.name}: no pools yet`);
    const missing = pooled.filter((e) => !e.checked_in).length;
    if (missing) problems.push(`${d.name}: ${missing} pooled player${missing === 1 ? " hasn't" : "s haven't"} checked in`);
    const moved = pooled.filter((e) => e.division_id !== d.id).length;
    if (moved) problems.push(`${d.name}: ${moved} pooled player${moved === 1 ? " has" : "s have"} moved to another division`);
    const pooledIds = new Set(pooled.map((e) => e.id));
    const unpooled = d.entrants.filter((e) => e.checked_in && !pooledIds.has(e.id)).length;
    if (unpooled && pooled.length) problems.push(`${d.name}: ${unpooled} checked-in player${unpooled === 1 ? " isn't" : "s aren't"} in a pool`);
  }
  return problems;
}

export default function TournamentManageView({ tournamentId, onDeleted }) {
  const { model, loading, error, reload } = useTournament(tournamentId);
  const [section, setSection] = useState("menu");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (loading && !model) {
    return (
      <div className="flex flex-col items-center gap-3 p-6">
        <LoadingMeteor />
      </div>
    );
  }
  if (!model) return <p className="p-6 text-center text-muted">{error}</p>;

  const t = model.tournament;
  const entrants = model.divisions.flatMap((d) => d.entrants);
  const checkedIn = entrants.filter((e) => e.checked_in).length;
  const problems = poolProblems(model);

  // Fresh data before a screen opens: scores keep arriving from other phones
  // all day, and screens like Finals and Results start from what they see.
  async function open(next) {
    setBusy(true);
    await reload();
    setBusy(false);
    setSection(next);
  }

  async function setStatus(status) {
    await update({ status });
  }

  async function update(fields) {
    setBusy(true);
    setActionError("");
    try {
      await updateTournament(t.id, fields);
      await reload();
    } catch (e) {
      console.error("Failed to change tournament status:", e);
      setActionError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    try {
      await deleteDraftTournament(t.id);
      onDeleted();
    } catch (e) {
      setActionError(friendlyError(e, e.message));
      setBusy(false);
    }
  }

  if (section !== "menu") {
    const back = () => {
      reload();
      setSection("menu");
    };
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 px-3">
          <button type="button" onClick={back} className="rounded-lg py-1 text-sm font-bold text-accent">
            ‹ {t.name}
          </button>
          <span className="text-sm font-bold text-muted">/ {SECTION_TITLES[section]}</span>
        </div>
        {section === "details" && <TournamentDetailsForm tournament={t} onSaved={() => reload()} />}
        {section === "players" && <EntrantsView model={model} reload={reload} onImport={() => open("import")} />}
        {section === "import" && <RosterImportView model={model} onDone={back} />}
        {section === "pools" && <PoolsView model={model} reload={reload} />}
        {section === "finals" && <FinalsView model={model} reload={reload} />}
        {section === "results" && <ResultsView model={model} onDone={back} />}
      </div>
    );
  }

  const nextStep = {
    draft: {
      text: "Import players and build pools, then publish to post everything on the public page.",
      label: "Publish (post pools publicly)",
      action: () => setStatus("published"),
    },
    published: {
      text:
        problems.length > 0
          ? "Before starting: check everyone in on Players, then rebuild pools so they only include checked-in players."
          : "Everyone in pools is checked in. Starting locks the pools and opens score entry.",
      label: "Start tournament (open scoring)",
      action: () => setStatus("live"),
      disabled: problems.length > 0,
    },
    live: {
      text: "Scoring is open. When finals are done, crown the winners to finish.",
      label: "Crown winners & finish",
      action: () => open("results"),
    },
    complete: {
      text: "This tournament is finished. Winners show on their profiles.",
      label: "Reopen scoring",
      action: () => setStatus("live"),
      secondary: true,
    },
  }[t.status];

  return (
    <div className="flex flex-col gap-2 px-3 pb-8">
      <Card className="gap-2 p-4">
        <p className="m-0 text-xs font-bold uppercase tracking-wide text-muted">Status</p>
        <p className="m-0 text-lg font-extrabold">{STATUS_LABELS[t.status]}</p>
        <p className="m-0 text-sm text-muted">{nextStep.text}</p>
        {t.status === "published" && problems.length > 0 && (
          <ul className="m-0 list-disc pl-5 text-sm text-warning">
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        )}
        <Button
          variant={nextStep.secondary ? "outline" : "primary"}
          onPress={nextStep.action}
          isDisabled={busy || nextStep.disabled}
          className="font-bold"
        >
          {nextStep.label}
        </Button>
        {t.status === "published" && (
          <button type="button" onClick={() => setStatus("draft")} disabled={busy} className="text-sm font-bold text-muted underline">
            Unpublish (back to draft)
          </button>
        )}
        {t.status === "live" && (
          <button type="button" onClick={() => setStatus("published")} disabled={busy} className="text-sm font-bold text-muted underline">
            Pause scoring (back to check-in)
          </button>
        )}
        {actionError && (
          <p role="alert" className="m-0 text-sm font-semibold text-red-400">
            {actionError}
          </p>
        )}
      </Card>

      <MenuCard icon="📝" label={SECTION_TITLES.details} subtitle="Name, date, location, scoring rules" onClick={() => open("details")} />
      <MenuCard
        icon="✅"
        label={SECTION_TITLES.players}
        subtitle={`${entrants.length} registered · ${checkedIn} checked in`}
        onClick={() => open("players")}
      />
      <MenuCard icon="📥" label={SECTION_TITLES.import} subtitle="Paste the Google Form responses" onClick={() => open("import")} />
      <MenuCard
        icon="🗂️"
        label={SECTION_TITLES.pools}
        subtitle="Round 1 pools, then Gold/Silver/Bronze round 2"
        onClick={() => open("pools")}
      />
      <MenuCard icon="🏐" label={SECTION_TITLES.finals} subtitle="Top 2 of each round 2 pool, best 2 of 3" onClick={() => open("finals")} />
      <MenuCard icon="👑" label={SECTION_TITLES.results} subtitle="Queen, Princess & best costume" onClick={() => open("results")} />

      {t.status !== "draft" && (
        <Card className="gap-2 p-3">
          <p className="m-0 font-bold">🎃 Best costume voting: {t.costume_voting_open ? "open" : "closed"}</p>
          <p className="m-0 text-sm text-muted">
            {t.costume_voting_open
              ? "Signed-in players can vote on the live page. Close it before crowning the winner."
              : "Opens a vote on the live page; each signed-in player gets one vote."}
          </p>
          <Button
            variant={t.costume_voting_open ? "outline" : "secondary"}
            onPress={() => update({ costume_voting_open: !t.costume_voting_open })}
            isDisabled={busy}
            className="font-bold"
          >
            {t.costume_voting_open ? "Close voting" : "Open voting"}
          </Button>
        </Card>
      )}

      {t.status === "draft" &&
        (confirmDelete ? (
          <Card className="gap-2 border border-danger/50 p-3">
            <p className="m-0 text-sm font-bold">Delete this draft tournament? Imported player profiles are kept.</p>
            <div className="flex gap-2">
              <Button variant="danger" onPress={handleDelete} isDisabled={busy} className="flex-1 font-bold">
                Delete draft
              </Button>
              <Button variant="outline" onPress={() => setConfirmDelete(false)} className="flex-1 font-bold">
                Cancel
              </Button>
            </div>
          </Card>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)} className="mt-4 text-sm font-bold text-danger underline">
            Delete this draft
          </button>
        ))}
    </div>
  );
}
