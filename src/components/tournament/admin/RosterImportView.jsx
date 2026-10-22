import { useEffect, useState } from "react";
import { Button, Card } from "@heroui/react";
import { supabase } from "../../../lib/supabaseClient.js";
import { importEntrants } from "../../../lib/tournamentApi.js";
import { matchDivision, matchToProfiles, parseRoster } from "../../../lib/rosterImport.js";
import { inputClass } from "./TournamentDetailsForm.jsx";

const NEW_PROFILE = "__new__";

// Step 1: paste the Google Form response sheet. Step 2: confirm each row's
// profile match and division. Step 3: import.
export default function RosterImportView({ model, onDone }) {
  // Loaded here (not via usePlayerDirectory) to know when it's finished:
  // matching against a not-yet-loaded list would make every player look new
  // and create duplicate profiles.
  const [directory, setDirectory] = useState(null);
  useEffect(() => {
    let cancelled = false;
    supabase
      .from("profiles")
      .select("id, display_name, avatar_url, is_manual")
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.error("Failed to load profiles for import:", error);
        setDirectory((data || []).filter((p) => p.display_name && p.display_name.trim()));
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const { divisions } = model;
  const enteredIds = new Set(divisions.flatMap((d) => d.entrants.map((e) => e.profile_id)));
  const [text, setText] = useState("");
  const [rows, setRows] = useState(null);
  const [parseError, setParseError] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  function handleReview() {
    const { players, error } = parseRoster(text);
    setParseError(error);
    if (error) return;
    setRows(
      matchToProfiles(players, directory).map((r) => ({
        ...r,
        divisionId: matchDivision(r.division, divisions) || "",
        include: !(r.profileId && enteredIds.has(r.profileId)),
      })),
    );
  }

  function update(i, fields) {
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...fields } : r)));
  }

  async function handleImport() {
    setImporting(true);
    const chosen = rows.filter((r) => r.include);
    const res = await importEntrants(model.tournament.id, chosen);
    setResult(res);
    setImporting(false);
  }

  if (result) {
    return (
      <div className="flex flex-col gap-3 px-3 pb-8">
        <Card className="gap-2 p-4">
          <p className="m-0 text-lg font-extrabold">✓ Added {result.added} player{result.added === 1 ? "" : "s"}</p>
          {result.failures.length > 0 && (
            <>
              <p className="m-0 font-bold text-warning">These couldn't be added:</p>
              <ul className="m-0 pl-5 text-sm">
                {result.failures.map((f) => (
                  <li key={f.name}>
                    {f.name} — {f.reason}
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
        <Button variant="primary" onPress={onDone} className="font-bold">
          Done
        </Button>
      </div>
    );
  }

  if (!rows) {
    return (
      <div className="flex flex-col gap-3 px-3 pb-8">
        <p className="m-0 text-sm text-muted">
          In the form's response spreadsheet, select everything (including the header row), copy, and paste it here.
          The app keeps name, division, email and phone, plus AVP rank, TruVolley score and a junior yes/no column if
          the sheet has them (for seeding). Date of birth is ignored.
        </p>
        <textarea
          rows={8}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"Email\tFirst name\tLast name\tCell phone\tDivision\n…"}
          aria-label="Pasted registration list"
          className={`${inputClass} font-mono text-xs`}
        />
        {parseError && (
          <p role="alert" className="m-0 text-sm font-semibold text-red-400">
            {parseError}
          </p>
        )}
        <Button variant="primary" onPress={handleReview} isDisabled={!text.trim() || !directory} className="font-bold">
          {directory ? "Review players" : "Loading players…"}
        </Button>
      </div>
    );
  }

  const included = rows.filter((r) => r.include);
  const missingDivision = included.some((r) => !r.divisionId);

  return (
    <div className="flex flex-col gap-3 px-3 pb-8">
      <p className="m-0 text-sm text-muted">
        Check each match. "New profile" creates a manual profile; the player can claim it later by signing up with the
        QR code (then use Merge Profiles).
      </p>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {rows.map((r, i) => {
          const already = r.profileId && enteredIds.has(r.profileId);
          return (
            <li key={`${r.name}-${i}`} className={`flex flex-col gap-2 rounded-xl border border-white/10 p-3 ${r.include ? "bg-white/5" : "opacity-50"}`}>
              <label className="flex items-center gap-2 font-bold">
                <input type="checkbox" checked={r.include} onChange={(e) => update(i, { include: e.target.checked })} className="h-5 w-5" />
                {r.name}
                {already && <span className="text-xs font-semibold text-muted">(already entered)</span>}
              </label>
              {(r.avpRank != null || r.truvolley != null || r.junior) && (
                <p className="m-0 text-xs text-muted">
                  {[r.avpRank != null && `AVP #${r.avpRank}`, r.truvolley != null && `TruVolley ${r.truvolley}`, r.junior && "Junior"]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
              <select
                value={r.profileId || NEW_PROFILE}
                onChange={(e) => update(i, { profileId: e.target.value === NEW_PROFILE ? null : e.target.value })}
                aria-label={`Profile for ${r.name}`}
                className={`${inputClass} py-1 text-sm`}
              >
                <option value={NEW_PROFILE}>New profile: {r.name}</option>
                {r.suggestions.map((s) => (
                  <option key={s.id} value={s.id}>
                    Existing: {s.display_name}
                    {s.is_manual ? " (manual)" : ""}
                  </option>
                ))}
              </select>
              {!r.profileId && r.suggestions.length > 0 && (
                <p className="m-0 text-xs text-warning">Similar names already exist. Pick one if it's the same person.</p>
              )}
              <select
                value={r.divisionId}
                onChange={(e) => update(i, { divisionId: e.target.value })}
                aria-label={`Division for ${r.name}`}
                className={`${inputClass} py-1 text-sm ${!r.divisionId && r.include ? "border-red-500" : ""}`}
              >
                <option value="">Choose division{r.division ? ` (form said "${r.division}")` : ""}</option>
                {divisions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </li>
          );
        })}
      </ul>
      {missingDivision && <p className="m-0 text-sm font-semibold text-warning">Pick a division for every checked player.</p>}
      <div className="flex gap-2">
        <Button variant="outline" onPress={() => setRows(null)} className="flex-1 font-bold">
          Back
        </Button>
        <Button variant="primary" onPress={handleImport} isDisabled={importing || missingDivision || !included.length} className="flex-1 font-bold">
          {importing ? "Importing…" : `Import ${included.length}`}
        </Button>
      </div>
    </div>
  );
}
