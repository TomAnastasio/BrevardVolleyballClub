import { describe, expect, it } from "vitest";
import {
  QUEUE_KEY,
  REJECTED,
  WAITING,
  addToQueue,
  applyQueueChange,
  buildRecordGameArgs,
  classifyUploadError,
  confirmedIds,
  mergeQueuedIntoHistory,
  newGameId,
  queueSummary,
  readQueue,
  recordFailure,
  removeFromQueue,
  writeQueue,
} from "./gameUploadQueue.js";

function memoryStorage(initial = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = String(v);
    },
    removeItem: (k) => {
      delete data[k];
    },
  };
}

const entry = (id, extra = {}) => ({
  id,
  userId: "me",
  args: { p_game_id: id },
  record: { id, nameA: "A", nameB: "B", a: 21, b: 15, date: "2026-10-25", time: "10:00" },
  ...extra,
});

describe("newGameId", () => {
  it("makes distinct UUIDs", () => {
    const a = newGameId();
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(newGameId()).not.toBe(a);
  });
});

describe("storage", () => {
  it("round-trips the queue and clears the key when empty", () => {
    const s = memoryStorage();
    const q = addToQueue([], entry("g1"));
    expect(writeQueue(s, q)).toBe(true);
    expect(readQueue(s)).toEqual(q);
    expect(writeQueue(s, [])).toBe(true);
    expect(s.data[QUEUE_KEY]).toBeUndefined();
  });

  it("reads garbage or a broken entry as nothing rather than crashing", () => {
    expect(readQueue(memoryStorage({ [QUEUE_KEY]: "{not json" }))).toEqual([]);
    expect(readQueue(memoryStorage({ [QUEUE_KEY]: '{"a":1}' }))).toEqual([]);
    expect(readQueue(memoryStorage({ [QUEUE_KEY]: JSON.stringify([{ id: "x" }, entry("ok")]) }))).toHaveLength(1);
    expect(readQueue(null)).toEqual([]);
  });

  it("reports a phone that won't store anything", () => {
    const s = { setItem: () => { throw new Error("QuotaExceeded"); }, removeItem: () => {} };
    expect(writeQueue(s, [entry("g1")])).toBe(false);
  });
});

describe("applyQueueChange (two tabs)", () => {
  it("applies each tab's change to what's stored, so neither wipes the other's games", () => {
    const s = memoryStorage();
    // Both tabs opened with an empty queue in memory.
    const tab1 = applyQueueChange(s, [], true, (q) => addToQueue(q, entry("from-tab-1")));
    const tab2 = applyQueueChange(s, [], true, (q) => addToQueue(q, entry("from-tab-2")));
    expect(tab2.queue.map((e) => e.id)).toEqual(["from-tab-1", "from-tab-2"]);
    // Tab 1 (stale memory) uploads its game: tab 2's game must survive.
    const after = applyQueueChange(s, tab1.queue, true, (q) => removeFromQueue(q, "from-tab-1"));
    expect(after.queue.map((e) => e.id)).toEqual(["from-tab-2"]);
    expect(readQueue(s).map((e) => e.id)).toEqual(["from-tab-2"]);
  });

  it("works from memory when the phone won't store anything", () => {
    const broken = { getItem: () => null, setItem: () => { throw new Error("blocked"); }, removeItem: () => {} };
    const first = applyQueueChange(broken, [], true, (q) => addToQueue(q, entry("a")));
    expect(first.stored).toBe(false);
    const second = applyQueueChange(broken, first.queue, false, (q) => addToQueue(q, entry("b")));
    expect(second.queue.map((e) => e.id)).toEqual(["a", "b"]);
  });
});

describe("queue changes", () => {
  it("adds a game once, waiting, and removes it only by id", () => {
    let q = addToQueue([], entry("g1"));
    q = addToQueue(q, entry("g1"));
    q = addToQueue(q, entry("g2"));
    expect(q.map((e) => [e.id, e.status, e.attempts])).toEqual([
      ["g1", WAITING, 0],
      ["g2", WAITING, 0],
    ]);
    expect(removeFromQueue(q, "g1").map((e) => e.id)).toEqual(["g2"]);
  });

  it("keeps a game after a failure, counting attempts", () => {
    let q = addToQueue([], entry("g1"));
    q = recordFailure(q, "g1", { message: "TypeError: Failed to fetch", code: "" });
    expect(q[0]).toMatchObject({ status: WAITING, attempts: 1, lastError: null });
    q = recordFailure(q, "g1", { message: "a ranked game needs all four players picked from the player list", code: "P0001" });
    expect(q[0]).toMatchObject({
      status: REJECTED,
      attempts: 2,
      lastError: "A ranked game needs all four players picked from the player list.",
    });
    // a later network failure on Retry puts it back to waiting
    q = recordFailure(q, "g1", { message: "Failed to fetch" });
    expect(q[0].status).toBe(WAITING);
  });
});

describe("classifyUploadError", () => {
  it("retries anything that might be temporary", () => {
    expect(classifyUploadError({ message: "TypeError: Failed to fetch", code: "" })).toBe(WAITING);
    expect(classifyUploadError({ message: "JWT expired", code: "PGRST301" })).toBe(WAITING);
    expect(classifyUploadError({ message: "Could not find the function", code: "PGRST202" })).toBe(WAITING);
    expect(classifyUploadError({ code: "40P01" })).toBe(WAITING); // deadlock
    expect(classifyUploadError(new Error("offline"))).toBe(WAITING);
    expect(classifyUploadError(undefined)).toBe(WAITING);
  });
  it("stops retrying on its own when the server refused the game", () => {
    expect(classifyUploadError({ code: "P0001" })).toBe(REJECTED);
    expect(classifyUploadError({ code: "22P02" })).toBe(REJECTED);
    expect(classifyUploadError({ code: "23503" })).toBe(REJECTED);
  });
});

describe("buildRecordGameArgs", () => {
  const meta = { id: "gid", date: "2026-10-25", time: "09:05", mode: "ranked" };

  it("2v2 beach: slots, with Player 1 from the picked A1 (not the submitter)", () => {
    const args = buildRecordGameArgs(
      {
        nameA: "Ann & Bo",
        nameB: "Cy & Di",
        a: 21,
        b: 19,
        format: "beach",
        teamSize: null,
        playerIdA1: "ann",
        participants: [
          { slot: "a2", userId: "bo" },
          { slot: "b1", userId: "cy" },
          { slot: "b2", userId: "di" },
        ],
      },
      meta,
    );
    expect(args).toEqual({
      p_game_id: "gid",
      p_name_a: "Ann & Bo",
      p_name_b: "Cy & Di",
      p_score_a: 21,
      p_score_b: 19,
      p_mode: "ranked",
      p_format: "beach",
      p_team_size: null,
      p_played_date: "2026-10-25",
      p_played_time: "09:05",
      p_a1: "ann",
      p_a2: "bo",
      p_b1: "cy",
      p_b2: "di",
      p_team_a: null,
      p_team_b: null,
    });
  });

  it("2v2 beach with a player typed in, not picked: that slot is empty", () => {
    const args = buildRecordGameArgs(
      { nameA: "x", nameB: "y", a: 21, b: 3, format: "beach", participants: [{ slot: "b2", userId: "di" }] },
      { ...meta, mode: "casual" },
    );
    expect([args.p_a1, args.p_a2, args.p_b1, args.p_b2]).toEqual([null, null, null, "di"]);
  });

  it("squad beach and indoor: team lists, no slots", () => {
    const participants = [
      { team: "a", userId: "p1" },
      { team: "b", userId: "p2" },
      { team: "a", userId: "p3" },
    ];
    const squad = buildRecordGameArgs({ format: "beach", teamSize: 3, participants, playerIdA1: "ignored" }, meta);
    expect([squad.p_team_size, squad.p_team_a, squad.p_team_b, squad.p_a1]).toEqual([3, ["p1", "p3"], ["p2"], null]);
    const indoor = buildRecordGameArgs({ format: "indoor", teamSize: 3, participants }, meta);
    expect([indoor.p_format, indoor.p_team_size, indoor.p_team_a]).toEqual(["indoor", null, ["p1", "p3"]]);
  });
});

describe("mergeQueuedIntoHistory", () => {
  const server = [
    { id: "s1", date: "2026-10-24", time: "10:00" },
    { id: "g2", date: "2026-10-25", time: "09:00" },
  ];
  const queue = addToQueue(addToQueue([], entry("g1")), entry("g2"));

  it("shows queued games marked, and lets the server copy win once it has one", () => {
    const merged = mergeQueuedIntoHistory(server, queue, true);
    expect(merged.map((g) => [g.id, Boolean(g.upload)])).toEqual([
      ["g1", true],
      ["g2", false],
      ["s1", false],
    ]);
    expect(merged[0].upload).toEqual({ status: WAITING, error: null, tried: true });
  });

  it("marks a game whose first upload is still under way as not tried yet", () => {
    const [mine] = mergeQueuedIntoHistory([], [entry("g1", { attempts: 0 })], true, "me");
    expect(mine.upload.tried).toBe(false);
    const [signedOut] = mergeQueuedIntoHistory([], [entry("g1", { attempts: 0 })], true, null);
    expect(signedOut.upload.tried).toBe(true);
  });

  it("on the phone's own list, the queued copy replaces the plain one", () => {
    const local = [{ id: "g1", date: "2026-10-25", time: "10:00", synced: true }];
    const merged = mergeQueuedIntoHistory(local, queue, false);
    expect(merged.map((g) => g.id).sort()).toEqual(["g1", "g2"]);
    expect(merged.every((g) => g.upload)).toBe(true);
  });

  it("finds queued games the server already has", () => {
    expect(confirmedIds(queue, server)).toEqual(["g2"]);
    expect(confirmedIds([], server)).toEqual([]);
  });
});

describe("queueSummary", () => {
  it("says nothing when nothing is waiting", () => {
    expect(queueSummary([], "me")).toBeNull();
  });
  it("stays quiet while a normal save's first upload is under way", () => {
    expect(queueSummary(addToQueue([], entry("a")), "me")).toBeNull();
  });
  it("counts waiting games in plain words", () => {
    const tried = (id) => entry(id, { status: WAITING, attempts: 1 });
    expect(queueSummary([tried("a")], "me").text).toMatch(/^1 game saved on this phone, waiting to upload\. It'll upload by itself/);
    expect(queueSummary([tried("a"), tried("b")], "me").text).toMatch(/^2 games saved .* They'll upload by themselves/);
  });
  it("calls out refused games first", () => {
    const q = recordFailure(addToQueue(addToQueue([], entry("a")), entry("b")), "a", { code: "P0001", message: "no" });
    expect(queueSummary(q, "me")).toMatchObject({ tone: "error" });
    expect(queueSummary(q, "me").text).toMatch(/^1 game couldn't be uploaded/);
  });
  it("explains games saved by another account, or while signed out", () => {
    expect(queueSummary([entry("a")], "someone-else").text).toMatch(/another account\. Sign in as that player/);
    expect(queueSummary([entry("a")], null).text).toMatch(/Sign in to upload it/);
  });
});
