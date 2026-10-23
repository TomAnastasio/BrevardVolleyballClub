import { describe, expect, it } from "vitest";
import { pickTheme } from "./activeTheme.js";

const at = (s) => new Date(s);

describe("pickTheme", () => {
  it("is Halloween from Oct 1 through the end of Oct 31, local time", () => {
    expect(pickTheme(at("2026-10-01T00:00"), "")).toBe("halloween");
    expect(pickTheme(at("2026-10-31T23:59"), "")).toBe("halloween");
  });

  it("is classic outside the window", () => {
    expect(pickTheme(at("2026-09-30T23:59"), "")).toBeNull();
    expect(pickTheme(at("2026-11-01T00:00"), "")).toBeNull();
    expect(pickTheme(at("2027-10-15T12:00"), "")).toBeNull();
  });

  it("lets ?theme= preview either look on any date", () => {
    expect(pickTheme(at("2026-10-20T12:00"), "?theme=classic")).toBeNull();
    expect(pickTheme(at("2026-12-01T12:00"), "?theme=halloween")).toBe("halloween");
    expect(pickTheme(at("2026-12-01T12:00"), "?t=abc&theme=halloween")).toBe("halloween");
  });

  it("ignores an unknown ?theme= value", () => {
    expect(pickTheme(at("2026-10-20T12:00"), "?theme=xmas")).toBe("halloween");
    expect(pickTheme(at("2026-12-01T12:00"), "?theme=xmas")).toBeNull();
  });
});
