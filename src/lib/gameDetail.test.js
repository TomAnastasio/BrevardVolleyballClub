import { describe, expect, it } from "vitest";
import { formatPlayedAt, rosterForSide } from "./gameDetail.js";

const alex = { id: "p1", name: "Alex", avatarUrl: null };
const sam = { id: "p2", name: "Sam", avatarUrl: "x.jpg" };

describe("rosterForSide", () => {
  it("returns a fully linked 2v2 team as-is", () => {
    const game = { format: "beach", teamSize: null, nameA: "Alex & Sam", teamAPlayers: [alex, sam] };
    expect(rosterForSide(game, "a")).toEqual([alex, sam]);
  });

  it("adds typed-in 2v2 names that aren't linked", () => {
    const game = { format: "beach", teamSize: null, nameB: "Alex & Jo", teamBPlayers: [alex] };
    expect(rosterForSide(game, "b")).toEqual([alex, { id: null, name: "Jo", avatarUrl: null }]);
  });

  it("shows both names when neither is linked", () => {
    const game = { format: "beach", teamSize: null, nameA: "Jo & Kim", teamAPlayers: [] };
    expect(rosterForSide(game, "a").map((p) => p.name)).toEqual(["Jo", "Kim"]);
  });

  it("never lists more than two players for 2v2", () => {
    const game = { format: "beach", teamSize: null, nameA: "Alexander & Kim", teamAPlayers: [alex] };
    expect(rosterForSide(game, "a")).toHaveLength(2);
  });

  it("leaves indoor and squad beach rosters alone", () => {
    expect(rosterForSide({ format: "indoor", nameA: "Alex, Jo", teamAPlayers: [alex] }, "a")).toEqual([alex]);
    expect(rosterForSide({ format: "beach", teamSize: 4, nameA: "Alex, Jo", teamAPlayers: [alex] }, "a")).toEqual([alex]);
  });
});

describe("formatPlayedAt", () => {
  it("formats the date and time", () => {
    expect(formatPlayedAt("2026-10-18", "18:42")).toBe("Sun, Oct 18, 2026 · 6:42 PM");
  });

  it("formats the date alone when there's no time", () => {
    expect(formatPlayedAt("2026-10-18", null)).toBe("Sun, Oct 18, 2026");
  });
});
