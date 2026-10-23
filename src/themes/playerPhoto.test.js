import { describe, expect, it } from "vitest";
import { playerPhoto } from "./playerPhoto.js";
import { HALLOWEEN_AVATARS, halloweenAvatarIndex } from "./halloween/avatars.js";

describe("playerPhoto", () => {
  it("always keeps a player's own photo", () => {
    expect(playerPhoto("https://x/me.jpg", "p1", "halloween")).toBe("https://x/me.jpg");
    expect(playerPhoto("https://x/me.jpg", "p1", null)).toBe("https://x/me.jpg");
  });

  it("leaves the blank circle when no theme is on", () => {
    expect(playerPhoto(null, "p1", null)).toBeNull();
    expect(playerPhoto("", "p1", null)).toBeNull();
  });

  it("lends a Halloween monster to players with no photo", () => {
    expect(HALLOWEEN_AVATARS).toHaveLength(100);
    expect(HALLOWEEN_AVATARS).toContain(playerPhoto(null, "p1", "halloween"));
  });

  it("gives the same player the same monster every time", () => {
    expect(playerPhoto(null, "abc", "halloween")).toBe(playerPhoto(null, "abc", "halloween"));
  });

  it("leaves typed-in names (no profile) blank", () => {
    expect(playerPhoto(null, null, "halloween")).toBeNull();
  });

  it("spreads players across many different monsters", () => {
    const picks = new Set(Array.from({ length: 200 }, (_, i) => halloweenAvatarIndex(`player-${i}`)));
    expect(picks.size).toBeGreaterThan(70);
  });
});
