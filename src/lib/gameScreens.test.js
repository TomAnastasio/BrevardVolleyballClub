import { describe, expect, it } from "vitest";
import { previousScreen, screenDepth } from "./gameScreens.js";

describe("game screens", () => {
  it("steps back through the setup flow", () => {
    expect(previousScreen("mode", "beach")).toBe("beach-size");
    expect(previousScreen("mode", "indoor")).toBe("format");
    expect(previousScreen("final-score", "beach")).toBe("new");
  });

  it("counts Back presses to the game menu", () => {
    expect(screenDepth("menu", null)).toBe(0);
    expect(screenDepth("active", "beach")).toBe(1);
    expect(screenDepth("history", null)).toBe(1);
    expect(screenDepth("new", "beach")).toBe(5);
    expect(screenDepth("new", "indoor")).toBe(4);
    expect(screenDepth("final-score", "beach")).toBe(6);
  });
});
