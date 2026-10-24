import { describe, expect, it } from "vitest";
import { rallyMatchup } from "./rallyMatchup.js";

const ranked = [
  { id: "p1", display_name: "First" },
  { id: "p2", display_name: "Second" },
  { id: "p3", display_name: "Third" },
];
const me = { id: "me", name: "Me" };

describe("rallyMatchup", () => {
  it("puts you against your toughest opponent", () => {
    const { left, right } = rallyMatchup({ user: me, toughestOpponent: { id: "p3", name: "Third" }, ranked });
    expect(left).toEqual({ id: "me", name: "Me" });
    expect(right).toEqual({ id: "p3", name: "Third" });
  });

  it("falls back to #1 when you have no toughest opponent", () => {
    expect(rallyMatchup({ user: me, toughestOpponent: null, ranked }).right).toEqual({ id: "p1", name: "First" });
  });

  it("falls back to #2 when you're #1", () => {
    const user = { id: "p1", name: "First" };
    expect(rallyMatchup({ user, toughestOpponent: null, ranked }).right).toEqual({ id: "p2", name: "Second" });
  });

  it("shows #1 vs #2 when signed out", () => {
    const { left, right } = rallyMatchup({ user: null, toughestOpponent: null, ranked });
    expect(left.id).toBe("p1");
    expect(right.id).toBe("p2");
  });

  it("leaves a side empty when there's nobody to show", () => {
    expect(rallyMatchup({ user: me, toughestOpponent: null, ranked: [] }).right).toBeNull();
    expect(rallyMatchup({ user: null, toughestOpponent: null, ranked: [] })).toEqual({ left: null, right: null });
  });
});
