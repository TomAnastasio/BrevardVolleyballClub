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

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (typeof saved.a !== "number" || typeof saved.b !== "number") return null;

    const format = normalizeFormat(saved.format);
    const state = { a: saved.a, b: saved.b, format };

    if (format === "indoor") {
      state.nameA = typeof saved.nameA === "string" && saved.nameA.trim() ? saved.nameA : "Team A";
      state.nameB = typeof saved.nameB === "string" && saved.nameB.trim() ? saved.nameB : "Team B";
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
      const key =
        prev.format === "indoor" ? `name${team === "a" ? "A" : "B"}` : `name${team === "a" ? "A" : "B"}${slot}`;
      return { ...prev, [key]: name };
    });
  }, []);

  const startGame = useCallback((payload) => {
    const format = normalizeFormat(payload.format);
    const next = { a: 0, b: 0, format, colorA: payload.colorA, colorB: payload.colorB, mode: payload.mode };
    if (format === "indoor") {
      next.nameA = payload.nameA;
      next.nameB = payload.nameB;
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
  const teamAName = !state ? "" : isIndoor ? state.nameA : `${state.nameA1} & ${state.nameA2}`;
  const teamBName = !state ? "" : isIndoor ? state.nameB : `${state.nameB1} & ${state.nameB2}`;
  // The submitter doesn't need a link of their own (already identified via
  // games.user_id) — only the other 3 slots' picked-from-search profile ids,
  // when present, become game_players rows once the game is saved.
  const participantIds =
    !state || isIndoor ? [] : [state.playerIdA2, state.playerIdB1, state.playerIdB2].filter(Boolean);
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
    participantIds,
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
