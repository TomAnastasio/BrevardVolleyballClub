import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { clearJoinParam, consumeJustJoined, isJoinRequested } from "./lib/joinLink.js";
import { consumePendingTournament, readTournamentParam } from "./lib/tournamentLink.js";

// Read once, outside React, since both are one-shot: `?join` is stripped from
// the address bar and the post-sign-in breadcrumb is consumed.
const joinRequested = isJoinRequested(window.location.search);
if (joinRequested) clearJoinParam();
const justJoined = consumeJustJoined();
// A shared tournament link (?t=<id>), or the tournament a player was on
// when they went to sign in with Google to keep score.
const tournamentId = readTournamentParam(window.location.search) || consumePendingTournament();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App joinRequested={joinRequested} justJoined={justJoined} tournamentId={tournamentId} />
  </React.StrictMode>,
);
