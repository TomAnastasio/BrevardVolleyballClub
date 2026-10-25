import { useMemo, useState } from "react";
import { Button } from "@heroui/react";
import { supabase } from "../../lib/supabaseClient.js";
import { usePlayerDirectory } from "../../hooks/usePlayerDirectory.js";
import PlayerSearchField from "../game/PlayerSearchField.jsx";
import { fuzzyFilter } from "../../lib/fuzzyMatch.js";
import { sanitizeName } from "../../lib/sanitizeName.js";
import { playerPhoto } from "../../themes/playerPhoto.js";

const fieldInputClass =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center text-base font-bold text-foreground placeholder:font-normal placeholder:text-muted focus-visible:outline-[3px] focus-visible:outline-accent focus-visible:outline-offset-2";

function SelectedProfile({ profile, onClear }) {
  if (!profile) return null;
  return (
    <div className="flex items-center justify-center gap-2 text-sm font-semibold">
      {profile.avatar_url ? (
        <img
          src={profile.avatar_url}
          alt=""
          aria-hidden="true"
          className="h-6 w-6 rounded-full border border-white/10 object-cover"
        />
      ) : (
        <span aria-hidden="true" className="h-6 w-6 rounded-full bg-white/10" />
      )}
      {profile.display_name}
      <button
        type="button"
        onClick={onClear}
        aria-label={`Clear ${profile.display_name}`}
        className="text-muted underline focus-visible:outline-[3px] focus-visible:outline-accent focus-visible:outline-offset-2"
      >
        change
      </button>
    </div>
  );
}

// "Does this player already exist?" check before merging: lists every
// profile whose name fuzzy-matches what's typed (tagged Google or manual),
// and when nobody has exactly that name, offers to create it right here as
// a manual profile (name only -- same insert as Add Manual Profile, minus
// the optional photo). onAdded hands the new row back so it's pickable in
// the merge fields below without a refetch.
function PlayerLookup({ directory, onAdded }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("idle"); // idle | saving | added | error
  const [addedName, setAddedName] = useState("");

  const name = sanitizeName(query, "");
  const matches = useMemo(() => fuzzyFilter(query, directory, (p) => p.display_name, 8), [query, directory]);
  const exactMatch = directory.some((p) => p.display_name.trim().toLowerCase() === name.toLowerCase());

  async function handleAdd() {
    if (!name || exactMatch) return;
    setStatus("saving");
    const { data, error } = await supabase
      .from("profiles")
      .insert({ display_name: name, avatar_url: null, is_manual: true })
      .select("id, display_name, avatar_url, is_manual")
      .single();
    if (error || !data) {
      console.error("Failed to add profile:", error);
      setStatus("error");
      return;
    }
    onAdded(data);
    setAddedName(data.display_name);
    setStatus("added");
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <label htmlFor="player-lookup" className="text-sm font-bold">
        Find a player
      </label>
      <div className="w-full max-w-80">
        <input
          id="player-lookup"
          type="text"
          value={query}
          maxLength={24}
          placeholder="Type a name to check"
          autoComplete="off"
          onChange={(e) => {
            setQuery(e.target.value);
            if (status !== "saving") setStatus("idle");
          }}
          className={fieldInputClass}
        />
      </div>

      {name && (
        <ul aria-label="Matching players" className="flex w-full max-w-80 flex-col gap-1">
          {matches.map((p) => {
            const photoUrl = playerPhoto(p.avatar_url, p.id);
            return (
              <li
                key={p.id}
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold"
              >
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt=""
                    aria-hidden="true"
                    className="h-6 w-6 flex-none rounded-full border border-white/10 object-cover"
                  />
                ) : (
                  <span aria-hidden="true" className="h-6 w-6 flex-none rounded-full bg-white/10" />
                )}
                <span className="flex-1">{p.display_name}</span>
                <span className="text-xs font-normal text-muted">{p.is_manual ? "Manual" : "Google"}</span>
              </li>
            );
          })}
          {matches.length === 0 && <li className="text-center text-sm text-muted">No players match "{name}".</li>}
        </ul>
      )}

      {name && !exactMatch && status !== "added" && (
        <Button variant="secondary" onPress={handleAdd} isDisabled={status === "saving"} className="font-bold">
          {status === "saving" ? "Adding…" : `+ Add "${name}" as a new player`}
        </Button>
      )}
      {status === "added" && <p className="text-sm font-semibold text-success">Added {addedName} as a manual profile.</p>}
      {status === "error" && (
        <p role="alert" className="text-sm font-semibold text-red-400">
          Couldn't add this player. Please try again.
        </p>
      )}
    </div>
  );
}

// Lets an admin collapse a manually-added profile into another profile of
// the same real person -- Google or manual -- moving the manual one's game
// history over and deleting it. The removed side is always manual (a
// Google profile is never deleted) -- see migrations 20261004140000 and
// 20261009120000 for why. Elo is intentionally left stale until the admin
// runs the existing "Recompute Elo Ratings" button, same as that
// migration's reasoning.
export default function MergeProfilesView() {
  // Reloaded after each merge. Until the reload lands, profiles added here
  // are listed from memory and merged-away ones are hidden.
  const [reloadKey, setReloadKey] = useState(0);
  const fetchedDirectory = usePlayerDirectory(true, reloadKey);
  const [addedProfiles, setAddedProfiles] = useState([]);
  const [mergedAwayIds, setMergedAwayIds] = useState([]);
  const directory = useMemo(() => {
    const byId = new Map([...addedProfiles, ...fetchedDirectory].map((p) => [p.id, p]));
    return [...byId.values()].filter((p) => !mergedAwayIds.includes(p.id));
  }, [fetchedDirectory, addedProfiles, mergedAwayIds]);
  const manualDirectory = useMemo(() => directory.filter((p) => p.is_manual), [directory]);
  const keepDirectory = directory;

  const [removeQuery, setRemoveQuery] = useState("");
  const [removeProfile, setRemoveProfile] = useState(null);
  const [keepQuery, setKeepQuery] = useState("");
  const [keepProfile, setKeepProfile] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | saving | done | error
  const [errorMessage, setErrorMessage] = useState("");

  function handlePickRemove(name, avatarUrl, id) {
    setRemoveQuery(name);
    setRemoveProfile(id ? manualDirectory.find((p) => p.id === id) || null : null);
  }

  function handlePickKeep(name, avatarUrl, id) {
    setKeepQuery(name);
    setKeepProfile(id ? keepDirectory.find((p) => p.id === id) || null : null);
  }

  function reset() {
    setRemoveQuery("");
    setRemoveProfile(null);
    setKeepQuery("");
    setKeepProfile(null);
  }

  async function handleMerge() {
    if (!removeProfile || !keepProfile) return;
    setStatus("saving");
    setErrorMessage("");
    try {
      const { error } = await supabase.rpc("merge_profiles", {
        p_keep_id: keepProfile.id,
        p_remove_id: removeProfile.id,
      });
      if (error) throw error;
      setMergedAwayIds((prev) => [...prev, removeProfile.id]);
      setReloadKey((k) => k + 1);
      setStatus("done");
      reset();
    } catch (e) {
      console.error("Failed to merge profiles:", e);
      setErrorMessage(e?.message || "Couldn't merge these profiles. Please try again.");
      setStatus("error");
    }
  }

  const canMerge = Boolean(removeProfile) && Boolean(keepProfile) && status !== "saving";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4">
        <p className="text-sm text-muted">
          Use this when the same person ended up with two profiles. Pick the manual profile to remove and the
          profile to keep (Google or manual). Their game history moves onto the kept profile and the manual one is deleted.
        </p>

        <PlayerLookup directory={directory} onAdded={(p) => setAddedProfiles((prev) => [...prev, p])} />

        <div className="flex flex-col items-center gap-2">
          <label className="text-sm font-bold">Manual profile to remove</label>
          <div className="w-full max-w-80">
            <PlayerSearchField
              value={removeQuery}
              onChange={handlePickRemove}
              placeholder="Search manual profiles"
              ariaLabel="Manual profile to remove"
              excludeIds={keepProfile ? [keepProfile.id] : undefined}
              directory={manualDirectory}
              inputClassName={fieldInputClass}
            />
          </div>
          <SelectedProfile profile={removeProfile} onClear={() => handlePickRemove("", null, null)} />
        </div>

        <div className="flex flex-col items-center gap-2">
          <label className="text-sm font-bold">Profile to keep</label>
          <div className="w-full max-w-80">
            <PlayerSearchField
              value={keepQuery}
              onChange={handlePickKeep}
              placeholder="Search all profiles"
              ariaLabel="Profile to keep"
              excludeIds={removeProfile ? [removeProfile.id] : undefined}
              directory={keepDirectory}
              inputClassName={fieldInputClass}
            />
          </div>
          <SelectedProfile profile={keepProfile} onClear={() => handlePickKeep("", null, null)} />
        </div>

        {removeProfile && keepProfile && (
          <p className="text-center text-sm font-semibold text-amber-400">
            This moves every game {removeProfile.display_name} played onto {keepProfile.display_name} and deletes
            the {removeProfile.display_name} profile. This can't be undone. Run "Recompute Elo Ratings" afterward
            to update ratings.
          </p>
        )}

        {status === "done" && (
          <p className="text-sm font-semibold text-success">Merged — don't forget to recompute Elo ratings.</p>
        )}
        {status === "error" && (
          <p role="alert" className="text-sm font-semibold text-red-400">
            {errorMessage}
          </p>
        )}
      </div>

      <div className="flex-none p-3" style={{ paddingBottom: "calc(0.75rem + var(--safe-bottom))" }}>
        <Button
          variant="primary"
          onPress={handleMerge}
          isDisabled={!canMerge}
          className="min-h-14 w-full text-lg font-extrabold"
        >
          {status === "saving" ? "Merging…" : "Merge Profiles"}
        </Button>
      </div>
    </div>
  );
}
