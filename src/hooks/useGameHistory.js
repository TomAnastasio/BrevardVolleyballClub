import { useCallback, useState } from "react";

const HISTORY_KEY = "bvc-game-history-v1";

function pad2(n) {
  return n < 10 ? "0" + n : String(n);
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function saveHistory(history) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (e) {
    /* storage unavailable, continue without persistence */
  }
}

export function useGameHistory() {
  const [history, setHistory] = useState(loadHistory);

  const addGame = useCallback((game) => {
    const now = new Date();
    const record = {
      id: "game-" + now.getTime(),
      nameA: game.nameA,
      nameB: game.nameB,
      a: game.a,
      b: game.b,
      date: now.getFullYear() + "-" + pad2(now.getMonth() + 1) + "-" + pad2(now.getDate()),
      time: pad2(now.getHours()) + ":" + pad2(now.getMinutes()),
    };
    setHistory((prev) => {
      const next = [record, ...prev];
      saveHistory(next);
      return next;
    });
  }, []);

  return { history, addGame };
}
