import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { ART } from "./index.js";
import { drawAvatar } from "../engine.js";

// Every item the database can hand out (the catalog in the tokens migration).
const sql = fs.readFileSync(new URL("../../../supabase/migrations/20261024200000_tokens_items_and_pulls.sql", import.meta.url), "utf8");
const CATALOG = [...sql.matchAll(/^\s*\('([^']+)', '(head|shirt|pants|shoes|transformation)', '(common|rare|epic|legendary)'/gm)].map((m) => ({ key: m[1], slot: m[2], tier: m[3] }));

// A canvas context that accepts every call and draws nothing.
function fakeContext() {
  const gradient = { addColorStop() {} };
  return new Proxy({}, {
    get: (target, prop) => (prop in target ? target[prop] : prop === "createRadialGradient" || prop === "createLinearGradient" ? () => gradient : () => {}),
    set: (target, prop, value) => { target[prop] = value; return true; },
  });
}

describe("item art", () => {
  it("reads the whole catalog from the migration", () => {
    expect(CATALOG.length).toBe(479);
  });

  it("has art for every item in the database, and nothing extra", () => {
    const missing = CATALOG.filter((c) => !ART.has(c.key)).map((c) => c.key);
    expect(missing).toEqual([]);
    expect(ART.size).toBe(CATALOG.length);
  });

  it("files every item under the database's slot and tier", () => {
    for (const c of CATALOG) expect([c.key, ART.get(c.key)?.slot, ART.get(c.key)?.tier]).toEqual([c.key, c.slot, c.tier]);
  });

  it("draws every item without errors", () => {
    const ctx = fakeContext();
    for (const { key, slot, item } of ART.values())
      for (const t of [0, 0.4, 1.3, 2.9, 7.7, 31.1])
        expect(() => drawAvatar(ctx, { [slot]: item }, 20, 40, t), key).not.toThrow();
  });
});
