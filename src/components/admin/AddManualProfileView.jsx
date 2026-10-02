import { useEffect, useRef, useState } from "react";
import { Button } from "@heroui/react";
import { supabase } from "../../lib/supabaseClient.js";
import { sanitizeName } from "../../lib/sanitizeName.js";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

function nameInputClass(hasError) {
  const base =
    "w-full rounded-lg border px-3 py-2 text-center text-base font-bold text-foreground placeholder:font-normal placeholder:text-muted focus-visible:outline-[3px] focus-visible:outline-offset-2";
  return hasError
    ? `${base} border-red-500 bg-red-500/10 focus-visible:outline-red-500`
    : `${base} border-white/10 bg-white/5 focus-visible:outline-accent`;
}

export default function AddManualProfileView({ onDone }) {
  const [name, setName] = useState("");
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [photoError, setPhotoError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  // The object URL is only valid for the lifetime of this component/file
  // selection — revoke the old one whenever it's replaced or on unmount so
  // the browser can release the underlying blob memory.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const trimmedName = sanitizeName(name, "");
  const canSave = Boolean(trimmedName) && !photoError && !saving;

  function handlePhotoChange(e) {
    const selected = e.target.files?.[0] || null;
    e.target.value = "";
    if (!selected) return;

    if (!selected.type.startsWith("image/")) {
      setPhotoError("Please choose an image file.");
      setFile(null);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }
    if (selected.size > MAX_PHOTO_BYTES) {
      setPhotoError("Photo must be smaller than 5MB.");
      setFile(null);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }

    setPhotoError("");
    setFile(selected);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(selected);
    });
  }

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setSaveError("");

    // Photo is optional -- a profile saved without one just has a null
    // avatar_url, and every screen that renders a player (leaderboard,
    // search, new-game form) already falls back to a placeholder for that,
    // same as it does for any other profile with no photo.
    let avatarUrl = null;
    if (file) {
      const path = `manual/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const { error: uploadError } = await supabase.storage.from("profile-photos").upload(path, file);
      if (uploadError) {
        setSaveError("Couldn't upload photo. Please try again.");
        setSaving(false);
        return;
      }
      avatarUrl = supabase.storage.from("profile-photos").getPublicUrl(path).data.publicUrl;
    }

    const { error: insertError } = await supabase.from("profiles").insert({
      display_name: trimmedName,
      avatar_url: avatarUrl,
      is_manual: true,
    });
    if (insertError) {
      setSaveError("Couldn't save profile. Please try again.");
      setSaving(false);
      return;
    }

    setSaving(false);
    setName("");
    setFile(null);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    onDone();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center gap-4 overflow-y-auto p-4">
        <div className="flex flex-col items-center gap-2">
          {previewUrl ? (
            <img src={previewUrl} alt="" className="h-24 w-24 rounded-full border border-white/10 object-cover" />
          ) : (
            <span
              aria-hidden="true"
              className="flex h-24 w-24 items-center justify-center rounded-full border border-white/10 bg-white/5 text-4xl text-muted"
            >
              👤
            </span>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold focus-visible:outline-[3px] focus-visible:outline-accent focus-visible:outline-offset-2"
          >
            {file ? "Choose a different photo" : "Choose photo (optional)"}
          </button>
          {photoError && (
            <p role="alert" className="text-center text-xs font-semibold text-red-400">
              {photoError}
            </p>
          )}
        </div>

        <div className="w-full max-w-80">
          <input
            type="text"
            value={name}
            maxLength={24}
            placeholder="Player name"
            aria-label="Player name"
            onChange={(e) => setName(e.target.value)}
            className={nameInputClass(false)}
          />
        </div>
      </div>

      <div className="flex-none p-3" style={{ paddingBottom: "calc(0.75rem + var(--safe-bottom))" }}>
        {saveError && (
          <p role="alert" className="mb-2 text-center text-sm font-semibold text-red-400">
            {saveError}
          </p>
        )}
        <Button
          variant="primary"
          onPress={handleSave}
          isDisabled={!canSave}
          className="min-h-14 w-full text-lg font-extrabold"
        >
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
