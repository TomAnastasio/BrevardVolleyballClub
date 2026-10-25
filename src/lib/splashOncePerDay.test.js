import { describe, expect, it } from "vitest";
import { claimSplashToday, localDateKey } from "./splashOncePerDay.js";

function memoryStorage() {
  const data = new Map();
  return { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, String(v)) };
}

describe("splash once per day", () => {
  it("shows on the first open of the day only", () => {
    const storage = memoryStorage();
    const morning = new Date(2026, 9, 25, 7, 0);
    expect(claimSplashToday(storage, morning)).toBe(true);
    expect(claimSplashToday(storage, new Date(2026, 9, 25, 18, 30))).toBe(false);
    expect(claimSplashToday(storage, new Date(2026, 9, 26, 0, 5))).toBe(true);
  });

  it("uses the phone's local date", () => {
    expect(localDateKey(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });

  it("skips the splash when storage fails", () => {
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {},
    };
    expect(claimSplashToday(broken)).toBe(false);
    const readOnly = {
      getItem: () => null,
      setItem: () => {
        throw new Error("full");
      },
    };
    expect(claimSplashToday(readOnly)).toBe(false);
  });
});
