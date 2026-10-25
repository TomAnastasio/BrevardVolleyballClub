import { describe, expect, it } from "vitest";
import { updatedElsewhere } from "./liveScoreSync.js";

const tappedAt = Date.parse("2026-10-31T10:00:00Z");

describe("updatedElsewhere", () => {
  it("is true when another phone set a different score after this phone's last tap", () => {
    expect(updatedElsewhere({ known: { a: 5, b: 3 }, tappedAt }, 9, 7, "2026-10-31T10:02:00Z")).toBe(true);
  });

  it("is false when the server's update is older than this phone's last tap", () => {
    expect(updatedElsewhere({ known: { a: 5, b: 3 }, tappedAt }, 9, 7, "2026-10-31T09:58:00Z")).toBe(false);
  });

  it("ignores this phone's own last score, whatever the clocks say", () => {
    expect(updatedElsewhere({ known: { a: 5, b: 3 }, tappedAt }, 5, 3, "2026-10-31T11:00:00Z")).toBe(false);
  });

  it("is false when the server never had a live score", () => {
    expect(updatedElsewhere({ known: null, tappedAt }, 0, 0, null)).toBe(false);
  });

  it("treats a saved score from before tap times were kept as older than any update", () => {
    expect(updatedElsewhere({ known: null, tappedAt: 0 }, 2, 1, "2026-10-31T09:00:00Z")).toBe(true);
  });
});
