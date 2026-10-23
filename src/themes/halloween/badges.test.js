import { describe, expect, it } from "vitest";
import { HALLOWEEN_BADGES, HALLOWEEN_UNRANKED } from "./badges.js";

describe("Halloween badges", () => {
  it("cover every tier and division the classic badges do, plus unranked", () => {
    for (const tier of ["bronze", "gold", "diamond", "top3", "lastplace"]) {
      for (const division of [1, 2, 3]) expect(HALLOWEEN_BADGES[tier][division], `${tier} ${division}`).toMatch(/svg/);
    }
    expect(HALLOWEEN_UNRANKED).toMatch(/svg/);
  });
});
