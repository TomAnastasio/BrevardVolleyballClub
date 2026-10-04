import { useMemo, useState } from "react";
import { Button } from "@heroui/react";
import { supabase } from "../../lib/supabaseClient.js";
import { usePlayerDirectory } from "../../hooks/usePlayerDirectory.js";
import PlayerSearchField from "../game/PlayerSearchField.jsx";

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

// Lets an admin collapse a manually-added profile into the Google profile
// of the same real person, moving the manual one's game history over and
// deleting it. The direction is fixed on purpose (manual -> Google, never
// the reverse, never Google -> Google) -- see migration 20261004140000 for
// why. Elo is intentionally left stale until the admin runs the existing
// "Recompute Elo Ratings" button, same as that migration's reasoning.
export default function MergeProfilesView() {
  const directory = usePlayerDirectory(true);
  const manualDirectory = useMemo(() => directory.filter((p) => p.is_manual), [directory]);
  const keepDirectory = useMemo(() => directory.filter((p) => !p.is_manual), [directory]);

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
          Use this when the same person ended up with two profiles — one added manually, one from signing in with
          Google. Their game history moves onto the Google profile and the manual one is deleted.
        </p>

        <div className="flex flex-col items-center gap-2">
          <label className="text-sm font-bold">Manual profile to remove</label>
          <div className="w-full max-w-80">
            <PlayerSearchField
              value={removeQuery}
              onChange={handlePickRemove}
              placeholder="Search manual profiles"
              ariaLabel="Manual profile to remove"
              directory={manualDirectory}
              inputClassName={fieldInputClass}
            />
          </div>
          <SelectedProfile profile={removeProfile} onClear={() => handlePickRemove("", null, null)} />
        </div>

        <div className="flex flex-col items-center gap-2">
          <label className="text-sm font-bold">Google profile to keep</label>
          <div className="w-full max-w-80">
            <PlayerSearchField
              value={keepQuery}
              onChange={handlePickKeep}
              placeholder="Search Google profiles"
              ariaLabel="Google profile to keep"
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
