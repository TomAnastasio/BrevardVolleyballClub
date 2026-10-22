import { useEffect, useRef, useState } from "react";
import { Button, Drawer, useOverlayState } from "@heroui/react";
import { supabase } from "../lib/supabaseClient.js";
import { useAuth } from "../hooks/useAuth.js";
import { ProfilePhotoError, prepareProfilePhoto } from "../lib/profilePhoto.js";

function Avatar({ src, className }) {
  if (!src) return <span aria-hidden="true" className={`block rounded-full border border-white/10 bg-white/5 ${className}`} />;
  return <img src={src} alt="" aria-hidden="true" className={`block rounded-full border border-white/10 object-cover ${className}`} />;
}

// The signed-in player's own avatar on their profile page: tapping it opens
// a bottom sheet to take a new photo or pick one from their library, shows a
// preview of the cropped result, then uploads it to their own folder in the
// 'profile-photos' bucket and points profiles.avatar_url at it (migration
// 20261022120000 — set_my_avatar_url()).
export default function ProfilePhotoEditor({ avatarUrl, onSaved }) {
  const { user, refreshProfile } = useAuth();
  const sheet = useOverlayState();
  const cameraInputRef = useRef(null);
  const libraryInputRef = useRef(null);
  const [photo, setPhoto] = useState(null); // { blob, previewUrl }
  const [status, setStatus] = useState("idle"); // idle | processing | saving
  const [error, setError] = useState("");

  useEffect(() => () => photo && URL.revokeObjectURL(photo.previewUrl), [photo]);

  // Each time the sheet closes (saved, cancelled, or swiped away), start
  // fresh next time it opens.
  useEffect(() => {
    if (sheet.isOpen) return;
    setPhoto(null);
    setStatus("idle");
    setError("");
  }, [sheet.isOpen]);

  async function handleFileChosen(e) {
    const file = e.target.files?.[0];
    // Clear so choosing the same file again still fires a change event.
    e.target.value = "";
    if (!file) return;
    setError("");
    setStatus("processing");
    try {
      const blob = await prepareProfilePhoto(file);
      setPhoto({ blob, previewUrl: URL.createObjectURL(blob) });
    } catch (err) {
      if (!(err instanceof ProfilePhotoError)) console.error("Failed to prepare profile photo:", err);
      setError(err instanceof ProfilePhotoError ? err.message : "Couldn't use that photo. Please try another.");
    }
    setStatus("idle");
  }

  async function handleSave() {
    setStatus("saving");
    setError("");
    try {
      // A new unique name per upload (never overwritten), so it can be cached
      // forever and nobody ever sees a stale copy of an old photo.
      const path = `${user.id}/${crypto.randomUUID()}.jpg`;
      const bucket = supabase.storage.from("profile-photos");
      const { error: uploadError } = await bucket.upload(path, photo.blob, {
        contentType: "image/jpeg",
        cacheControl: "31536000",
      });
      if (uploadError) throw uploadError;
      const url = bucket.getPublicUrl(path).data.publicUrl;
      const { error: rpcError } = await supabase.rpc("set_my_avatar_url", { p_url: url });
      if (rpcError) throw rpcError;
      onSaved(url);
      refreshProfile();
      sheet.close();
    } catch (err) {
      console.error("Failed to save profile photo:", err);
      setError("Couldn't save your photo. Please check your connection and try again.");
      setStatus("idle");
    }
  }

  const busy = status !== "idle";

  return (
    <Drawer state={sheet}>
      <Drawer.Trigger
        aria-label="Change profile photo"
        className="relative h-16 w-16 flex-none rounded-full p-0 focus-visible:outline-[3px] focus-visible:outline-accent focus-visible:outline-offset-2"
      >
        <Avatar src={avatarUrl} className="h-16 w-16" />
        <span
          aria-hidden="true"
          className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-accent text-sm"
        >
          📷
        </span>
      </Drawer.Trigger>
      <Drawer.Backdrop>
        <Drawer.Content placement="bottom">
          <Drawer.Dialog>
            <Drawer.Handle />
            <Drawer.Header>
              <Drawer.Heading>{photo ? "Use this photo?" : "Change profile photo"}</Drawer.Heading>
            </Drawer.Header>
            <Drawer.Body>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="user"
                onChange={handleFileChosen}
                className="hidden"
                aria-hidden="true"
                tabIndex={-1}
              />
              <input
                ref={libraryInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChosen}
                className="hidden"
                aria-hidden="true"
                tabIndex={-1}
              />
              {photo && (
                <div className="flex justify-center py-2">
                  <img
                    src={photo.previewUrl}
                    alt="Preview of your new profile photo"
                    className="h-40 w-40 rounded-full border-2 border-accent/40 object-cover"
                  />
                </div>
              )}
              {status === "processing" && <p className="m-0 text-center text-sm text-muted">Preparing photo…</p>}
              {error && (
                <p role="alert" className="m-0 text-center text-sm font-semibold text-red-400">
                  {error}
                </p>
              )}
            </Drawer.Body>
            <Drawer.Footer
              className="flex-col items-stretch gap-2"
              style={{ paddingBottom: "calc(1rem + var(--safe-bottom))" }}
            >
              {photo ? (
                <>
                  <Button variant="primary" onPress={handleSave} isDisabled={busy} className="min-h-14 w-full text-lg font-extrabold">
                    {status === "saving" ? "Saving…" : "Save photo"}
                  </Button>
                  <Button variant="outline" onPress={() => setPhoto(null)} isDisabled={busy} className="min-h-12 w-full font-bold">
                    Choose a different photo
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="primary"
                    onPress={() => cameraInputRef.current?.click()}
                    isDisabled={busy}
                    className="min-h-14 w-full text-lg font-extrabold"
                  >
                    📷 Take photo
                  </Button>
                  <Button
                    variant="secondary"
                    onPress={() => libraryInputRef.current?.click()}
                    isDisabled={busy}
                    className="min-h-14 w-full text-lg font-bold"
                  >
                    🖼️ Choose from library
                  </Button>
                  <Button variant="outline" slot="close" className="min-h-12 w-full font-bold">
                    Cancel
                  </Button>
                </>
              )}
            </Drawer.Footer>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
}
