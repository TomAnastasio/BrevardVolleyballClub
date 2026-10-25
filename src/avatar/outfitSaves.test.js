import { describe, expect, it, vi } from "vitest";
import { addSave, applySaves, confirmSave, dropSave, settleSaves } from "./outfitSaves.js";
import { shareUntilFailure } from "./itemArt.js";

const wearHat = (o) => ({ ...o, head: "hat" });
const wearTee = (o) => ({ ...o, shirt: "tee" });
const base = { head: null, shirt: null };

describe("outfit saves", () => {
  it("shows every unconfirmed change on top of the fetched outfit, in tap order", () => {
    let saves = addSave([], 1, wearHat, "me");
    saves = addSave(saves, 2, (o) => ({ ...o, head: "cap" }), "me");
    expect(applySaves(base, saves)).toEqual({ head: "cap", shirt: null });
  });

  it("a late fetch from before tap B lands without flashing the old outfit", () => {
    // Tap A succeeded (fetch #2 onward includes it); tap B is still saving.
    let saves = confirmSave(addSave(addSave([], 1, wearHat, "me"), 2, wearTee, "me"), 1, 2);
    // Fetch #1 started before A was saved, so it has neither change.
    saves = settleSaves(saves, 1);
    expect(applySaves(base, saves)).toEqual({ head: "hat", shirt: "tee" });
    // Fetch #2 has A: A is no longer needed, B still shows.
    saves = settleSaves(saves, 2);
    expect(saves.map((s) => s.id)).toEqual([2]);
    expect(applySaves({ head: "hat", shirt: null }, saves)).toEqual({ head: "hat", shirt: "tee" });
  });

  it("a failed save undoes only its own change", () => {
    let saves = addSave(addSave([], 1, wearHat, "me"), 2, wearTee, "me");
    saves = dropSave(saves, 1);
    expect(applySaves(base, saves)).toEqual({ head: null, shirt: "tee" });
  });

  it("keeps the same list when a fetch settles nothing", () => {
    const saves = addSave([], 1, wearHat, "me");
    expect(settleSaves(saves, 5)).toBe(saves);
  });
});

describe("shareUntilFailure", () => {
  it("loads once and shares the result", async () => {
    const load = vi.fn().mockResolvedValue("art");
    const get = shareUntilFailure(load);
    expect(await get()).toBe("art");
    expect(await get()).toBe("art");
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("forgets a failure so the next call tries again", async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error("Failed to fetch dynamically imported module")).mockResolvedValue("art");
    const get = shareUntilFailure(load);
    await expect(get()).rejects.toThrow(/dynamically imported/);
    expect(await get()).toBe("art");
    expect(load).toHaveBeenCalledTimes(2);
  });
});
