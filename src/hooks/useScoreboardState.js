import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "bvc-scoreboard-v1";
const WIN_SCORE = 21;

function loadState() {
  const fallback = { a: 0, b: 0, nameA: "Team A", nameB: "Team B" };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const saved = JSON.parse(raw);
    return {
      a: typeof saved.a === "number" ? saved.a : fallback.a,
      b: typeof saved.b === "number" ? saved.b : fallback.b,
      nameA: typeof saved.nameA === "string" && saved.nameA.trim() ? saved.nameA : fallback.nameA,
      nameB: typeof saved.nameB === "string" && saved.nameB.trim() ? saved.nameB : fallback.nameB,
    };
  } catch (e) {
    return fallback;
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
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    saveState(state);
  }, [state]);

  const changeScore = useCallback((team, delta) => {
    setState((prev) => {
      const next = Math.max(0, prev[team] + delta);
      return { ...prev, [team]: next };
    });
    setBannerDismissed(false);
    vibrate(delta > 0 ? 15 : [10, 30, 10]);
  }, []);

  const setName = useCallback((team, name) => {
    setState((prev) => ({ ...prev, [team === "a" ? "nameA" : "nameB"]: name }));
  }, []);

  const resetGame = useCallback(() => {
    setState((prev) => ({ ...prev, a: 0, b: 0 }));
    setBannerDismissed(false);
    vibrate(20);
  }, []);

  const dismissBanner = useCallback(() => {
    setBannerDismissed(true);
  }, []);

  const aWins = state.a >= WIN_SCORE && state.a > state.b;
  const bWins = state.b >= WIN_SCORE && state.b > state.a;
  const winnerName = aWins ? state.nameA : bWins ? state.nameB : null;
  const showBanner = Boolean(winnerName) && !bannerDismissed;

  return {
    state,
    aWins,
    bWins,
    winnerName,
    showBanner,
    changeScore,
    setName,
    resetGame,
    dismissBanner,
    resetScoresOnly: () => {
      setState((prev) => ({ ...prev, a: 0, b: 0 }));
      setBannerDismissed(false);
    },
  };
}

export { WIN_SCORE };
