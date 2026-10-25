import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import "./index.css";
import "./themes/halloween/halloween.css";
import { activeTheme, applyTheme } from "./themes/activeTheme.js";
import { clearJoinParam, consumeJustJoined, isJoinRequested } from "./lib/joinLink.js";
import { consumePendingTournament, readTournamentParam } from "./lib/tournamentLink.js";
import { consumePendingMyProfile } from "./lib/pendingMyProfile.js";
import { startGameUploader } from "./lib/gameUploader.js";
import { claimSplashToday } from "./lib/splashOncePerDay.js";

// Read once, outside React, since both are one-shot: `?join` is stripped from
// the address bar and the post-sign-in breadcrumb is consumed.
const joinRequested = isJoinRequested(window.location.search);
if (joinRequested) clearJoinParam();
const justJoined = consumeJustJoined();
// A shared tournament link (?t=<id>), or the tournament a player was on
// when they went to sign in with Google to keep score.
const tournamentId = readTournamentParam(window.location.search) || consumePendingTournament();
// Signed in from the home screen's "Sign in" button: open their own profile.
const myProfileRequested = consumePendingMyProfile();
// The BVC splash plays on the first open of the day only. A sign-up QR scan
// skips it so the visitor goes straight to Google.
const showSplash = !joinRequested && claimSplashSafely();

function claimSplashSafely() {
  try {
    return claimSplashToday(window.localStorage);
  } catch {
    return false;
  }
}

// Seasonal skin, if one is on today (see src/themes/activeTheme.js).
applyTheme(activeTheme);

// Uploads games saved on this phone that haven't reached the server yet,
// whichever screen is open (see src/lib/gameUploader.js).
startGameUploader();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {/* Last-resort safety net; App.jsx also wraps each screen in one. */}
    <ErrorBoundary>
      <App
        joinRequested={joinRequested}
        justJoined={justJoined}
        tournamentId={tournamentId}
        myProfileRequested={myProfileRequested}
        showSplash={showSplash}
      />
    </ErrorBoundary>
  </React.StrictMode>,
);
