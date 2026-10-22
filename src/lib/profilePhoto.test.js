import { describe, expect, it } from "vitest";
import { centerSquareCrop } from "./profilePhoto.js";

describe("centerSquareCrop", () => {
  it("crops the middle of a portrait photo", () => {
    expect(centerSquareCrop(3000, 4000)).toEqual({ sx: 0, sy: 500, side: 3000 });
  });

  it("crops the middle of a landscape photo", () => {
    expect(centerSquareCrop(4000, 3000)).toEqual({ sx: 500, sy: 0, side: 3000 });
  });

  it("leaves a square photo whole", () => {
    expect(centerSquareCrop(800, 800)).toEqual({ sx: 0, sy: 0, side: 800 });
  });
});
