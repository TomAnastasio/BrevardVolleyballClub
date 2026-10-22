import { useState } from "react";
import { Button } from "@heroui/react";
import { useAuth } from "../../../hooks/useAuth.js";
import { createTournament, friendlyError, updateTournament } from "../../../lib/tournamentApi.js";

export const inputClass =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-base text-foreground placeholder:text-muted focus-visible:outline-[3px] focus-visible:outline-accent focus-visible:outline-offset-2";

export function Field({ label, htmlFor, hint, children }) {
  return (
    <label htmlFor={htmlFor} className="flex flex-col gap-1">
      <span className="text-sm font-bold">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

const DEFAULT_DIVISIONS = "Women's Open\nWomen's AA\nWomen's A";

// Create (no `tournament`) or edit (with `tournament`) a tournament's
// details and game rules. Divisions are entered here on create; afterward
// they're managed from the Players screen.
export default function TournamentDetailsForm({ tournament, onSaved }) {
  const { user } = useAuth();
  const editing = Boolean(tournament);
  const [name, setName] = useState(tournament?.name ?? "");
  const [eventDate, setEventDate] = useState(tournament?.event_date ?? "");
  const [location, setLocation] = useState(tournament?.location ?? "");
  const [divisions, setDivisions] = useState(DEFAULT_DIVISIONS);
  const [ranked, setRanked] = useState(tournament?.ranked ?? true);
  const [winScore, setWinScore] = useState(String(tournament?.win_score ?? 21));
  const [winByTwo, setWinByTwo] = useState(tournament?.win_by_two ?? true);
  const [pointCap, setPointCap] = useState(tournament?.point_cap ? String(tournament.point_cap) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const divisionNames = [...new Set(divisions.split("\n").map((d) => d.trim()).filter(Boolean))];
  const winScoreNum = Number(winScore);
  const capNum = pointCap === "" ? null : Number(pointCap);
  const valid =
    name.trim() &&
    eventDate &&
    Number.isInteger(winScoreNum) &&
    winScoreNum > 0 &&
    winScoreNum < 100 &&
    (capNum === null || (Number.isInteger(capNum) && capNum >= winScoreNum && capNum < 100)) &&
    (editing || divisionNames.length > 0);

  async function handleSave() {
    if (!valid) return;
    setSaving(true);
    setError("");
    setSaved(false);
    const fields = {
      name: name.trim(),
      event_date: eventDate,
      location: location.trim() || null,
      ranked,
      win_score: winScoreNum,
      win_by_two: winByTwo,
      point_cap: capNum,
    };
    try {
      const result = editing
        ? await updateTournament(tournament.id, fields)
        : await createTournament({ ...fields, divisions: divisionNames }, user.id);
      setSaved(true);
      onSaved(result);
    } catch (e) {
      console.error("Failed to save tournament:", e);
      setError(friendlyError(e, "Couldn't save the tournament. Please try again."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 px-3 pb-8">
      <Field label="Name" htmlFor="t-name">
        <input id="t-name" className={inputClass} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="Queen of Paradise" />
      </Field>
      <Field label="Date" htmlFor="t-date">
        <input id="t-date" type="date" className={inputClass} value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
      </Field>
      <Field label="Location" htmlFor="t-location">
        <input id="t-location" className={inputClass} value={location} maxLength={200} onChange={(e) => setLocation(e.target.value)} placeholder="Paradise Beach, Melbourne" />
      </Field>
      {!editing && (
        <Field label="Divisions" htmlFor="t-divisions" hint="One per line. You can add more later.">
          <textarea id="t-divisions" rows={3} className={inputClass} value={divisions} onChange={(e) => setDivisions(e.target.value)} />
        </Field>
      )}

      <fieldset className="flex flex-col gap-3 rounded-xl border border-white/10 p-3">
        <legend className="px-1 text-sm font-bold">Game rules</legend>
        <Field label="Games are played to" htmlFor="t-win">
          <input id="t-win" type="number" inputMode="numeric" className={inputClass} value={winScore} onChange={(e) => setWinScore(e.target.value)} />
        </Field>
        <label className="flex items-center gap-2 text-sm font-bold">
          <input type="checkbox" checked={winByTwo} onChange={(e) => setWinByTwo(e.target.checked)} className="h-5 w-5 accent-[var(--accent)]" />
          Win by 2
        </label>
        <Field label="Point cap (optional)" htmlFor="t-cap" hint="First to this score wins, even without a 2-point lead.">
          <input id="t-cap" type="number" inputMode="numeric" className={inputClass} value={pointCap} onChange={(e) => setPointCap(e.target.value)} placeholder="None" />
        </Field>
      </fieldset>

      <label className="flex items-center gap-2 text-sm font-bold">
        <input type="checkbox" checked={ranked} onChange={(e) => setRanked(e.target.checked)} className="h-5 w-5 accent-[var(--accent)]" />
        Games count toward Elo rankings
      </label>

      {error && (
        <p role="alert" className="m-0 text-sm font-semibold text-red-400">
          {error}
        </p>
      )}
      {saved && editing && (
        <p role="status" className="m-0 text-sm font-semibold text-success">
          ✓ Saved
        </p>
      )}
      <Button variant="primary" onPress={handleSave} isDisabled={!valid || saving} className="min-h-12 font-extrabold">
        {saving ? "Saving…" : editing ? "Save changes" : "Create tournament"}
      </Button>
    </div>
  );
}
