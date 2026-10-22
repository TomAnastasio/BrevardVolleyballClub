import { describe, expect, it } from "vitest";
import { rankTitle } from "./rankTitle.js";

describe("rankTitle", () => {
  it("names tiered badges by tier and Roman-numeral division", () => {
    expect(rankTitle("bronze", 1)).toBe("Bronze I");
    expect(rankTitle("gold", 2)).toBe("Gold II");
    expect(rankTitle("diamond", 3)).toBe("Diamond III");
  });

  it("names each top3 crest by place (division 3 is #1)", () => {
    expect(rankTitle("top3", 3)).toBe("Champion");
    expect(rankTitle("top3", 2)).toBe("Amethyst");
    expect(rankTitle("top3", 1)).toBe("Emerald");
  });

  it("names last place and unranked", () => {
    expect(rankTitle("lastplace")).toBe("Platinum");
    expect(rankTitle("unranked")).toBe("Unranked");
  });

  it("returns null for unknown tiers or divisions", () => {
    expect(rankTitle("silver", 1)).toBeNull();
    expect(rankTitle("gold", 4)).toBeNull();
  });
});
