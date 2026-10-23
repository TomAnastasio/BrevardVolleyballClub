import { useEffect } from "react";
import LoadingMeteor from "./LoadingMeteor.jsx";
import PlayerProfileById from "./PlayerProfileById.jsx";
import { useAuth } from "../hooks/useAuth.js";

// The signed-in player's own profile, opened from the photo in the home
// screen's corner (or right after signing in from its "Sign in" button).
// If they turn out not to be signed in (e.g. they backed out of Google),
// there's no profile to show, so go back home.
export default function MyProfileView({ onBack, ...profileProps }) {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) onBack();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  if (!user) {
    return (
      <main className="animate-view-in flex flex-1 flex-col items-center justify-center gap-3 p-6">
        <LoadingMeteor />
        <p className="m-0 text-center text-muted">Loading your profile…</p>
      </main>
    );
  }
  return <PlayerProfileById playerId={user.id} onBack={onBack} backLabel="Menu" {...profileProps} />;
}
