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

describe("playerPhoto with Google letter circles", () => {
  const letter = (url) => url === "https://lh3.googleusercontent.com/a/letter=s96-c";

  it("swaps a Google letter circle for a monster during Halloween", () => {
    expect(HALLOWEEN_AVATARS).toContain(playerPhoto("https://lh3.googleusercontent.com/a/letter=s96-c", "p1", "halloween", letter));
  });

  it("keeps real Google photos", () => {
    expect(playerPhoto("https://lh3.googleusercontent.com/a/face=s96-c", "p1", "halloween", letter)).toBe(
      "https://lh3.googleusercontent.com/a/face=s96-c",
    );
  });

  it("keeps the letter circle when no theme is on", () => {
    expect(playerPhoto("https://lh3.googleusercontent.com/a/letter=s96-c", "p1", null, letter)).toBe(
      "https://lh3.googleusercontent.com/a/letter=s96-c",
    );
  });
});
