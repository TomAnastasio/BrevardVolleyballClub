import { useCallback, useEffect, useState } from "react";
import { DEFAULT_COLOR_A, DEFAULT_COLOR_B } from "../lib/teamColors.js";

const STORAGE_KEY = "bvc-scoreboard-v1";
const WIN_SCORE = 21;

const NAME_FIELDS = {
  nameA1: "Player 1",
  nameA2: "Player 2",
  nameB1: "Player 1",
  nameB2: "Player 2",
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (typeof saved.a !== "number" || typeof saved.b !== "number") return null;

    const state = { a: saved.a, b: saved.b };
    for (const key of Object.keys(NAME_FIELDS)) {
      state[key] = typeof saved[key] === "string" && saved[key].trim() ? saved[key] : NAME_FIELDS[key];
    }
    state.colorA = typeof saved.colorA === "string" ? saved.colorA : DEFAULT_COLOR_A;
    state.colorB = typeof saved.colorB === "string" ? saved.colorB : DEFAULT_COLOR_B;
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
    const key = `name${team === "a" ? "A" : "B"}${slot}`;
    setState((prev) => ({ ...prev, [key]: name }));
  }, []);

  const startGame = useCallback((payload) => {
    setState({
      a: 0,
      b: 0,
      nameA1: payload.nameA1,
      nameA2: payload.nameA2,
      nameB1: payload.nameB1,
      nameB2: payload.nameB2,
      colorA: payload.colorA,
      colorB: payload.colorB,
    });
    setBannerDismissed(false);
  }, []);

  const clearActiveGame = useCallback(() => {
    setState(null);
    setBannerDismissed(false);
  }, []);

  const dismissBanner = useCallback(() => {
    setBannerDismissed(true);
  }, []);

  const aWins = Boolean(state) && state.a >= WIN_SCORE && state.a > state.b;
  const bWins = Boolean(state) && state.b >= WIN_SCORE && state.b > state.a;
  const teamAName = state ? `${state.nameA1} & ${state.nameA2}` : "";
  const teamBName = state ? `${state.nameB1} & ${state.nameB2}` : "";
  const winnerName = aWins ? teamAName : bWins ? teamBName : null;
  const showBanner = Boolean(winnerName) && !bannerDismissed;

  return {
    state,
    hasActiveGame: state !== null,
    aWins,
    bWins,
    teamAName,
    teamBName,
    winnerName,
    showBanner,
    changeScore,
    setName,
    startGame,
    clearActiveGame,
    dismissBanner,
  };
}

export { WIN_SCORE };
