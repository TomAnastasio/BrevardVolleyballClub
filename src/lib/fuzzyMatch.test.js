import { describe, expect, it } from "vitest";
import { fuzzyFilter } from "./fuzzyMatch.js";

const names = ["John Smith", "Jon Snow", "Jane Doe", "Taylor Reed"];

describe("fuzzyFilter", () => {
  it("returns nothing for an empty or whitespace-only query", () => {
    expect(fuzzyFilter("", names, (n) => n)).toEqual([]);
    expect(fuzzyFilter("   ", names, (n) => n)).toEqual([]);
  });

  it("ranks an exact match first", () => {
    const results = fuzzyFilter("Jon Snow", names, (n) => n);
    expect(results[0]).toBe("Jon Snow");
  });

  it("ranks a prefix match above an unrelated substring match", () => {
    const results = fuzzyFilter("Jo", names, (n) => n);
    // "John Smith" and "Jon Snow" both start with "Jo"; "Jane Doe" does not.
    expect(results.slice(0, 2).sort()).toEqual(["John Smith", "Jon Snow"]);
  });

  it("matches an in-order subsequence (typo/skipped-letter tolerant)", () => {
    const results = fuzzyFilter("jsmth", names, (n) => n);
    expect(results).toContain("John Smith");
  });

  it("excludes names whose letters aren't in the query's order", () => {
    const results = fuzzyFilter("htmsj", names, (n) => n);
    expect(results).not.toContain("John Smith");
  });

  it("respects the result limit", () => {
    const manyNames = Array.from({ length: 10 }, (_, i) => `Taylor ${i}`);
    const results = fuzzyFilter("Taylor", manyNames, (n) => n, 3);
    expect(results).toHaveLength(3);
  });
});
