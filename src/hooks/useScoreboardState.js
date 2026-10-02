import { useCallback, useEffect, useState } from "react";
import { DEFAULT_COLOR_A, DEFAULT_COLOR_B } from "../lib/teamColors.js";
import { normalizeMode } from "../lib/gameMode.js";

const STORAGE_KEY = "bvc-scoreboard-v1";
const DEFAULT_FORMAT = "beach";
const WIN_SCORE_BY_FORMAT = { beach: 21, indoor: 25 };

const NAME_FIELDS = {
  nameA1: "Player 1",
  nameA2: "Player 2",
  nameB1: "Player 1",
  nameB2: "Player 2",
};

function normalizeFormat(format) {
  return format === "indoor" ? "indoor" : DEFAULT_FORMAT;
}

function winScoreFor(format) {
  return WIN_SCORE_BY_FORMAT[normalizeFormat(format)];
}

function sanitizeRoster(roster) {
  if (!Array.isArray(roster)) return [];
  return roster
    .filter((p) => p && typeof p.id === "string" && typeof p.name === "string")
    .map((p) => ({ id: p.id, name: p.name, avatarUrl: typeof p.avatarUrl === "string" ? p.avatarUrl : null }));
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (typeof saved.a !== "number" || typeof saved.b !== "number") return null;

    const format = normalizeFormat(saved.format);
    const state = { a: saved.a, b: saved.b, format };

    if (format === "indoor") {
      state.teamAPlayers = sanitizeRoster(saved.teamAPlayers);
      state.teamBPlayers = sanitizeRoster(saved.teamBPlayers);
    } else {
      for (const key of Object.keys(NAME_FIELDS)) {
        state[key] = typeof saved[key] === "string" && saved[key].trim() ? saved[key] : NAME_FIELDS[key];
      }
      state.playerIdA2 = typeof saved.playerIdA2 === "string" ? saved.playerIdA2 : null;
      state.playerIdB1 = typeof saved.playerIdB1 === "string" ? saved.playerIdB1 : null;
      state.playerIdB2 = typeof saved.playerIdB2 === "string" ? saved.playerIdB2 : null;
    }

    state.colorA = typeof saved.colorA === "string" ? saved.colorA : DEFAULT_COLOR_A;
    state.colorB = typeof saved.colorB === "string" ? saved.colorB : DEFAULT_COLOR_B;
    state.mode = normalizeMode(saved.mode);
    return state;
  } catch (e) {
    return null;
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    /* storage unavailable, continue without persistence */
  }
}

function vibrate(pattern) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

export function useScoreboardState() {
  const [state, setState] = useState(loadState);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    if (state === null) {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) {
        /* storage unavailable, continue without persistence */
      }
    } else {
      saveState(state);
    }
  }, [state]);

  const changeScore = useCallback((team, delta) => {
    setState((prev) => {
      const next = Math.max(0, prev[team] + delta);
      return { ...prev, [team]: next };
    });
    setBannerDismissed(false);
    vibrate(delta > 0 ? 15 : [10, 30, 10]);
  }, []);

  const setName = useCallback((team, slot, name) => {
    setState((prev) => {
      if (prev.format === "indoor") return prev; // rosters replace editable team names
      const key = `name${team === "a" ? "A" : "B"}${slot}`;
      return { ...prev, [key]: name };
    });
  }, []);

  const startGame = useCallback((payload) => {
    const format = normalizeFormat(payload.format);
    const next = { a: 0, b: 0, format, colorA: payload.colorA, colorB: payload.colorB, mode: payload.mode };
    if (format === "indoor") {
      next.teamAPlayers = sanitizeRoster(payload.teamAPlayers);
      next.teamBPlayers = sanitizeRoster(payload.teamBPlayers);
    } else {
      next.nameA1 = payload.nameA1;
      next.nameA2 = payload.nameA2;
      next.nameB1 = payload.nameB1;
      next.nameB2 = payload.nameB2;
      next.playerIdA2 = payload.playerIdA2 ?? null;
      next.playerIdB1 = payload.playerIdB1 ?? null;
      next.playerIdB2 = payload.playerIdB2 ?? null;
    }
    setState(next);
    setBannerDismissed(false);
  }, []);

  const clearActiveGame = useCallback(() => {
    setState(null);
    setBannerDismissed(false);
  }, []);

  const dismissBanner = useCallback(() => {
    setBannerDismissed(true);
  }, []);

  const format = state ? normalizeFormat(state.format) : DEFAULT_FORMAT;
  const winScore = winScoreFor(format);
  const isIndoor = format === "indoor";
  const aWins = Boolean(state) && state.a >= winScore && state.a - state.b >= 2;
  const bWins = Boolean(state) && state.b >= winScore && state.b - state.a >= 2;
  const teamAName = !state
    ? ""
    : isIndoor
      ? state.teamAPlayers.map((p) => p.name).join(", ")
      : `${state.nameA1} & ${state.nameA2}`;
  const teamBName = !state
    ? ""
    : isIndoor
      ? state.teamBPlayers.map((p) => p.name).join(", ")
      : `${state.nameB1} & ${state.nameB2}`;
  // The submitter doesn't need a link of their own (already identified via
  // games.user_id, implicit slot a1) — only the other 3 slots' picked-from-
  // search profile ids, when present, become game_players rows once the
  // game is saved. Each one is tagged with its slot (not just flattened to
  // an id) so the Elo trigger can tell which team a linked player was on.
  // Indoor has no implicit submitter slot (roster size is variable, see
  // migration 0011), so every picked player on both rosters becomes a row.
  const participants = !state
    ? []
    : isIndoor
      ? [
          ...state.teamAPlayers.map((p) => ({ team: "a", userId: p.id })),
          ...state.teamBPlayers.map((p) => ({ team: "b", userId: p.id })),
        ]
      : [
          { slot: "a2", userId: state.playerIdA2 },
          { slot: "b1", userId: state.playerIdB1 },
          { slot: "b2", userId: state.playerIdB2 },
        ].filter((p) => p.userId);
  const winnerName = aWins ? teamAName : bWins ? teamBName : null;
  const showBanner = Boolean(winnerName) && !bannerDismissed;

  return {
    state,
    hasActiveGame: state !== null,
    format,
    isIndoor,
    winScore,
    aWins,
    bWins,
    teamAName,
    teamBName,
    participants,
    winnerName,
    showBanner,
    changeScore,
    setName,
    startGame,
    clearActiveGame,
    dismissBanner,
  };
}

export { WIN_SCORE_BY_FORMAT };
