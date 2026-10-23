import { describe, expect, it } from "vitest";
import {
  addPoint,
  isSwitchPoint,
  pointsUntilSwitch,
  removePoint,
  sanitizePoints,
  servingTeam,
} from "./serveAndSwitch.js";

describe("servingTeam", () => {
  it("is unknown before the first point", () => {
    expect(servingTeam([])).toBe(null);
  });

  it("is whoever won the last rally", () => {
    expect(servingTeam(addPoint(["a", "a"], "b"))).toBe("b");
  });
});

describe("removePoint", () => {
  it("takes back that team's most recent point, not just the last rally", () => {
    expect(removePoint(["a", "b", "a", "b"], "a")).toEqual(["a", "b", "b"]);
  });

  it("leaves the order alone when the team has no points", () => {
    const points = ["a"];
    expect(removePoint(points, "b")).toBe(points);
  });
});

describe("side switches", () => {
  it("fires on every 7th combined point", () => {
    expect([0, 6, 7, 13, 14, 21].map(isSwitchPoint)).toEqual([false, false, true, false, true, true]);
  });

  it("counts down to the next switch", () => {
    expect(pointsUntilSwitch(0)).toBe(7);
    expect(pointsUntilSwitch(4)).toBe(3);
    expect(pointsUntilSwitch(14)).toBe(7);
  });
});

describe("sanitizePoints", () => {
  it("keeps a point order that matches the score", () => {
    expect(sanitizePoints(["a", "b", "a"], 2, 1)).toEqual(["a", "b", "a"]);
  });

  it("drops an order that doesn't match the score, or is missing", () => {
    expect(sanitizePoints(["a"], 2, 1)).toEqual([]);
    expect(sanitizePoints(undefined, 3, 4)).toEqual([]);
    expect(sanitizePoints(["a", "x"], 1, 0)).toEqual(["a"]);
  });
});
