import { useEffect, useMemo, useState } from "react";
import { Button, Card } from "@heroui/react";
import PlayerSearchField from "../../game/PlayerSearchField.jsx";
import { usePlayerDirectory } from "../../../hooks/usePlayerDirectory.js";
import {
  addDivision,
  deleteDivision,
  fetchContacts,
  friendlyError,
  importEntrants,
  removeEntrant,
  updateEntrant,
} from "../../../lib/tournamentApi.js";
import { playerName } from "../tournamentFormat.js";
import { inputClass } from "./TournamentDetailsForm.jsx";

function EntrantRow({ entrant, name, contact, divisions, onChanged, setError }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  async function run(fn) {
    setBusy(true);
    setError("");
    try {
      await fn();
      await onChanged();
    } catch (e) {
      console.error("Entrant update failed:", e);
      setError(friendlyError(e, `Couldn't update ${name}. If they're already in pools, rebuild pools first.`));
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="rounded-xl border border-white/10 bg-white/5">
      <div className="flex items-center gap-2 p-2">
        <button
          type="button"
          onClick={() => run(() => updateEntrant(entrant.id, { checked_in: !entrant.checked_in }))}
          disabled={busy}
          aria-pressed={entrant.checked_in}
          aria-label={`${name}: ${entrant.checked_in ? "checked in, tap to undo" : "tap to check in"}`}
          className={`flex h-11 w-11 flex-none items-center justify-center rounded-lg border-2 text-xl font-black ${
            entrant.checked_in ? "border-success bg-success text-black" : "border-white/30"
          }`}
        >
          {entrant.checked_in ? "✓" : ""}
        </button>
        <button type="button" onClick={() => setOpen((o) => !o)} className="min-w-0 flex-1 text-left">
          <span className="block truncate font-semibold">{name}</span>
          <span className="block text-xs text-muted">{entrant.checked_in ? "Checked in" : "Not checked in"} · details ›</span>
        </button>
      </div>
      {open && (
        <div className="flex flex-col gap-2 border-t border-white/10 p-3 text-sm">
          <p className="m-0 text-muted">
            {contact?.email || "No email"} · {contact?.phone || "No phone"}
          </p>
          <label className="flex items-center gap-2">
            <span className="font-bold">Division</span>
            <select
              value={entrant.division_id}
              disabled={busy}
              onChange={(e) => run(() => updateEntrant(entrant.id, { division_id: e.target.value }))}
              className={`${inputClass} py-1`}
            >
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          {confirmRemove ? (
            <div className="flex gap-2">
              <Button variant="danger" size="sm" onPress={() => run(() => removeEntrant(entrant.id))} isDisabled={busy}>
                Remove {name}
              </Button>
              <Button variant="outline" size="sm" onPress={() => setConfirmRemove(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmRemove(true)} className="self-start font-bold text-danger underline">
              Remove from tournament
            </button>
          )}
        </div>
      )}
    </li>
  );
}

export default function EntrantsView({ model, reload, onImport }) {
  const { divisions, profilesById } = model;
  const directory = usePlayerDirectory(true);
  const [contacts, setContacts] = useState(new Map());
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");
  const [addName, setAddName] = useState("");
  const [addProfileId, setAddProfileId] = useState(null);
  const [addDivisionId, setAddDivisionId] = useState(divisions[0]?.id ?? "");
  const [newDivision, setNewDivision] = useState("");
  const [busy, setBusy] = useState(false);

  const entrantIds = useMemo(() => divisions.flatMap((d) => d.entrants.map((e) => e.id)), [divisions]);
  const entrantKey = entrantIds.join(",");
  useEffect(() => {
    fetchContacts(entrantIds)
      .then(setContacts)
      .catch((e) => console.error("Failed to load contacts:", e));
  }, [entrantKey]);

  const enteredIds = divisions.flatMap((d) => d.entrants.map((e) => e.profile_id));
  const query = filter.trim().toLowerCase();

  async function handleAdd() {
    if (!addName.trim() || !addDivisionId) return;
    setBusy(true);
    setError("");
    const { failures } = await importEntrants(model.tournament.id, [
      { profileId: addProfileId, name: addName.trim(), divisionId: addDivisionId },
    ]);
    if (failures.length) setError(failures[0].reason);
    else {
      setAddName("");
      setAddProfileId(null);
    }
    await reload();
    setBusy(false);
  }

  async function handleAddDivision() {
    if (!newDivision.trim()) return;
    setBusy(true);
    setError("");
    try {
      await addDivision(model.tournament.id, newDivision.trim(), divisions.length);
      setNewDivision("");
      await reload();
    } catch (e) {
      setError(friendlyError(e, "Couldn't add that division (is the name already used?)."));
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteDivision(id) {
    setBusy(true);
    setError("");
    try {
      await deleteDivision(id);
      await reload();
    } catch (e) {
      setError(friendlyError(e, "Couldn't delete that division."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 px-3 pb-8">
      <input
        type="search"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Find a player…"
        aria-label="Find a player"
        className={inputClass}
      />
      {error && (
        <p role="alert" className="m-0 text-sm font-semibold text-red-400">
          {error}
        </p>
      )}

      {divisions.map((d) => {
        const list = d.entrants.filter((e) => !query || playerName(profilesById, e.profile_id).toLowerCase().includes(query));
        const checked = d.entrants.filter((e) => e.checked_in).length;
        return (
          <section key={d.id} className="flex flex-col gap-2">
            <h3 className="m-0 flex items-baseline justify-between text-lg font-extrabold">
              <span>{d.name}</span>
              <span className={`text-sm ${d.entrants.length < d.min_players ? "text-warning" : "text-muted"}`}>
                {checked}/{d.entrants.length} checked in
                {d.entrants.length < d.min_players ? ` · below ${d.min_players}-player minimum` : ""}
              </span>
            </h3>
            {d.entrants.length === 0 && (
              <button type="button" onClick={() => handleDeleteDivision(d.id)} disabled={busy} className="self-start text-sm font-bold text-muted underline">
                Delete empty division
              </button>
            )}
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {list.map((e) => (
                <EntrantRow
                  key={e.id}
                  entrant={e}
                  name={playerName(profilesById, e.profile_id)}
                  contact={contacts.get(e.id)}
                  divisions={divisions}
                  onChanged={reload}
                  setError={setError}
                />
              ))}
            </ul>
          </section>
        );
      })}

      <Card className="gap-2 p-3">
        <p className="m-0 font-bold">Add a walk-up player</p>
        <PlayerSearchField
          value={addName}
          onChange={(name, _avatar, id) => {
            setAddName(name);
            setAddProfileId(id);
          }}
          placeholder="Search players, or type a new name"
          ariaLabel="Player to add"
          directory={directory}
          excludeIds={enteredIds}
          inputClassName={inputClass}
        />
        <p className="m-0 text-xs text-muted">
          {addName.trim() && !addProfileId ? `"${addName.trim()}" will get a new manual profile.` : " "}
        </p>
        <select value={addDivisionId} onChange={(e) => setAddDivisionId(e.target.value)} aria-label="Division" className={inputClass}>
          {divisions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <Button variant="primary" onPress={handleAdd} isDisabled={busy || !addName.trim() || !addDivisionId} className="font-bold">
          Add player
        </Button>
        <button type="button" onClick={onImport} className="self-start text-sm font-bold text-accent underline">
          Import the whole registration list instead ›
        </button>
      </Card>

      <Card className="gap-2 p-3">
        <p className="m-0 font-bold">Add a division</p>
        <div className="flex gap-2">
          <input value={newDivision} onChange={(e) => setNewDivision(e.target.value)} placeholder="e.g. Juniors" aria-label="New division name" className={inputClass} />
          <Button variant="secondary" onPress={handleAddDivision} isDisabled={busy || !newDivision.trim()} className="font-bold">
            Add
          </Button>
        </div>
      </Card>
    </div>
  );
}
