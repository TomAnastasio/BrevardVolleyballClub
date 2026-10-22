import { describe, expect, it } from "vitest";
import { buildJoinUrl, isJoinRequested } from "./joinLink.js";

describe("join link", () => {
  it("builds a URL that isJoinRequested recognizes", () => {
    const url = new URL(buildJoinUrl("https://brevardvolleyballclub.com", "/"));
    expect(url.href).toBe("https://brevardvolleyballclub.com/?join=1");
    expect(isJoinRequested(url.search)).toBe(true);
  });

  it("ignores ordinary visits", () => {
    expect(isJoinRequested("")).toBe(false);
    expect(isJoinRequested("?foo=bar")).toBe(false);
  });
});
