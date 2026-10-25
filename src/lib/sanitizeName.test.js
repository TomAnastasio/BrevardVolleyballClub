import { describe, expect, it } from "vitest";
import { nameOrPlaceholder, NAMELESS_PLAYER, sanitizeName } from "./sanitizeName.js";

describe("sanitizeName", () => {
  it("collapses spaces, trims and caps at 24 characters", () => {
    expect(sanitizeName("  Ana   Lima ", "")).toBe("Ana Lima");
    expect(sanitizeName("x".repeat(30), "")).toHaveLength(24);
  });
  it("uses the fallback for a blank name (empty means the form can't save)", () => {
    expect(sanitizeName(" \t ", "")).toBe("");
    expect(sanitizeName(null, "Player 1")).toBe("Player 1");
  });
});

describe("nameOrPlaceholder", () => {
  it("keeps a real name as it is", () => {
    expect(nameOrPlaceholder("A Very Long Google Account Name")).toBe("A Very Long Google Account Name");
  });
  it("gives a missing or blank name the same placeholder as the database", () => {
    expect(nameOrPlaceholder(null)).toBe(NAMELESS_PLAYER);
    expect(nameOrPlaceholder("   ")).toBe("New player");
  });
});
