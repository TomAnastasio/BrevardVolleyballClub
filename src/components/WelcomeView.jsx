import { useEffect, useRef } from "react";
import { Button } from "@heroui/react";
import LoadingMeteor from "./LoadingMeteor.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { setJustJoined } from "../lib/joinLink.js";

// Where someone lands after scanning the admin's sign-up QR code. On the
// first visit (`joinRequested`) a signed-out player is sent straight to
// Google; when they come back signed in, this confirms their profile exists.
export default function WelcomeView({ joinRequested, onRankings, onHome }) {
  const { user, loading, isConfigured, signInWithGoogle } = useAuth();
  const redirectStarted = useRef(false);
  const shouldRedirect = joinRequested && isConfigured && !loading && !user;

  function startSignIn() {
    redirectStarted.current = true;
    setJustJoined();
    signInWithGoogle();
  }

  useEffect(() => {
    if (shouldRedirect && !redirectStarted.current) startSignIn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldRedirect]);

  const firstName = (user?.user_metadata?.full_name || "").split(" ")[0];
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;

  let content;
  if (loading || shouldRedirect) {
    content = (
      <>
        <LoadingMeteor size={120} />
        <p className="m-0 text-sm text-muted">Opening Google sign-in…</p>
      </>
    );
  } else if (user) {
    content = (
      <>
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-20 w-20 rounded-full border-2 border-accent/40" />
        ) : (
          <span aria-hidden="true" className="text-5xl">
            🏐
          </span>
        )}
        <h2 className="m-0 text-2xl font-bold">{firstName ? `Welcome, ${firstName}!` : "Welcome!"}</h2>
        <p className="m-0 max-w-80 text-sm text-muted">
          You're signed up for Brevard Volleyball Club. Your games and rating will follow you from here on.
        </p>
        <div className="flex w-full max-w-80 flex-col gap-2">
          <Button variant="primary" onPress={onRankings} className="min-h-14 w-full text-lg font-extrabold">
            See Rankings
          </Button>
          <Button variant="secondary" onPress={onHome} className="min-h-12 w-full font-bold">
            Home
          </Button>
        </div>
      </>
    );
  } else if (!isConfigured) {
    content = <p className="m-0 text-sm text-muted">Sign-up isn't available right now.</p>;
  } else {
    content = (
      <>
        <h2 className="m-0 text-lg font-bold">Sign-in didn't finish</h2>
        <p className="m-0 max-w-80 text-sm text-muted">No worries — try again whenever you're ready.</p>
        <div className="flex w-full max-w-80 flex-col gap-2">
          <Button variant="primary" onPress={startSignIn} className="min-h-14 w-full text-lg font-extrabold">
            Sign in with Google
          </Button>
          <Button variant="secondary" onPress={onHome} className="min-h-12 w-full font-bold">
            Home
          </Button>
        </div>
      </>
    );
  }

  return <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">{content}</main>;
}
