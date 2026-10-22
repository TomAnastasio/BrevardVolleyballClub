import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { clearJoinParam, consumeJustJoined, isJoinRequested } from "./lib/joinLink.js";

// Read once, outside React, since both are one-shot: `?join` is stripped from
// the address bar and the post-sign-in breadcrumb is consumed.
const joinRequested = isJoinRequested(window.location.search);
if (joinRequested) clearJoinParam();
const justJoined = consumeJustJoined();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App joinRequested={joinRequested} justJoined={justJoined} />
  </React.StrictMode>,
);
