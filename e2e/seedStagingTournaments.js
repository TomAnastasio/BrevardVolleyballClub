// One-off seeding script for three demo tournaments on the staging Supabase
// project -- run with `node e2e/seedStagingTournaments.js` (after
// seedStagingGames.js, whose players it reuses). Each one sits at a
// different stage and is built to hit edge cases worth testing by hand:
//
// 1. "Fall Classic 2026" -- complete, ranked (games move Elo).
//    Open: 17 entered, 1 no-show (not checked in), 4 pools of 4 -> round 2
//      by place (Gold/Silver/Bronze/Copper). Gold final goes to all 3 sets
//      and a junior is a Gold finalist (junior/cash-prize warning). Silver
//      final ends 2-0 (set 3 "not needed"). Bronze final is one set. Copper
//      has no final. Two different players share the name "Sam Lee".
//    Juniors: one pool of 5 -> no round 2, its top 2 go straight to a
//      one-set final. Pool-of-4 and pool-of-5 rules, deuce and cap scores
//      (e.g. 30-29, 23-22) all appear.
// 2. "Halloween Bash" -- live right now, casual (no Elo).
//    Open: 2 pools of 5, round 1 fully scored with a tie still to settle
//      (same wins and points against). Round 2 ranks everyone together
//      (5 per pool can't split evenly), Gold partly scored with one game
//      mid-play (live score), Silver not started.
//    Rec: one pool of 7 -- not a 4 or 5, so it uses the tournament's own
//      rules (to 21, no win-by-2, no cap) -- half scored.
//    Masters: 3 entrants, too few for a pool.
// 3. A published (upcoming) tournament with an 80-character name and a
//    long location. Open: 9 players -> a pool of 5 and a pool of 4 (two
//    rule sets), one pool without a court, nothing scored. Intermediate:
//    entrants only, some not checked in, no pools yet. Beginners: empty.
//
// Players: the seedStagingGames.js players plus tournament-only manual
// profiles with awkward names (apostrophes, accents, hyphens, long names,
// a duplicate). Never the e2e bots or the Alice/Bob/Carla/Dana fixtures --
// specs count those players' tournament games.
//
// Same access path as the other seed scripts: the admin test bot's own
// session (never the service-role key), the same tables and RPCs the app's
// admin screens use, and the app's own pool/round 2 logic
// (src/lib/queenOfCourt.js). Scores go through the normal score-entry RPC,
// which dates each game "now", so these games show today's date, not the
// tournament's (same as the real app when scores are entered late).
//
// Safe to re-run: a tournament that already exists (by name) is skipped,
// and nothing is ever deleted. Refuses to run against anything but staging.
import { getAdminSession } from "./signInAsTestUser.js";
import {
  buildPoolSchedule,
  computeStandings,
  FINAL_FORMATS,
  planRound2,
  poolLabel,
  poolRules,
  rankStandings,
  splitIntoPools,
  tierName,
  unresolvedTies,
} from "../src/lib/queenOfCourt.js";

const STAGING_REF = "cbgismbfbfvovxhvhtor";

const TOURNAMENT_ONLY = [
  "Shay O'Neil",
  "Zoë Ramírez",
  "Mary-Kate Lin",
  "Bethany Van Der Berg",
  "Anastasia Papadopoulou",
  "Jo",
  "Kiki",
  "Lani Kealoha",
  "Sierra Blake",
  "Tori Nguyen",
  "Camille Dubois",
  "Rosa Delgado",
  "Willow Hart",
  "Nora Feld",
  "Paige Turner",
  "Elena Petrova",
  "Skye Malone",
  "June Okafor",
  "Lucy Pham",
  "Sam Lee",
  "Sam Lee",
];

// ---------------------------------------------------------------------------
// Deterministic randomness, so each tournament comes out the same each time.
// ---------------------------------------------------------------------------

function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function skillOf(id) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return (h % 1000) / 1000;
}

const between = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));

// A legal final score under these rules for the given winner ("a"/"b"):
// mostly a plain win, sometimes extra points, sometimes a cap hit.
function scoreFor(rng, rules, winner) {
  const { winScore, winByTwo, pointCap } = rules;
  let w = winScore;
  let l = between(rng, Math.max(0, winScore - 12), winScore - (winByTwo ? 2 : 1));
  const r = rng();
  if (winByTwo && r < 0.25) {
    if (pointCap && r < 0.1) {
      w = pointCap;
      l = pointCap - 1;
    } else {
      w = between(rng, winScore + 1, pointCap ? pointCap - 1 : winScore + 4);
      l = w - 2;
    }
  }
  return winner === "a" ? [w, l] : [l, w];
}

function playGame(rng, rules, [[a1, a2], [b1, b2]], skill) {
  const edge = (skill(a1) + skill(a2) - skill(b1) - skill(b2)) / 2;
  return scoreFor(rng, rules, rng() < 0.5 + edge * 0.7 ? "a" : "b");
}

const scheduleCache = new Map();
const scheduleFor = (n) => {
  if (!scheduleCache.has(n)) scheduleCache.set(n, buildPoolSchedule(n));
  return scheduleCache.get(n);
};

// ---------------------------------------------------------------------------
// Planning: the whole tournament is simulated in memory first (pools, every
// score, round 2, finals), checked against what it's meant to show, and
// only then written. `scoreUpTo` limits how many games of a pool get a
// score (for in-progress tournaments).
// ---------------------------------------------------------------------------

function planPool({ rng, entrants, label, round, court, fallbackRules, skill, scoreUpTo = Infinity }) {
  const rules = poolRules(entrants.length, fallbackRules);
  const matches = scheduleFor(entrants.length).map(([[a1, a2], [b1, b2]], n) => {
    const ids = [entrants[a1], entrants[a2], entrants[b1], entrants[b2]].map((e) => e.profileId);
    const game = [ids.slice(0, 2), ids.slice(2)];
    const scores = n < scoreUpTo ? playGame(rng, rules, game, skill) : null;
    return { a1: ids[0], a2: ids[1], b1: ids[2], b2: ids[3], scoreA: scores?.[0] ?? null, scoreB: scores?.[1] ?? null };
  });
  const standings = rankStandings(computeStandings(entrants.map((e) => e.profileId), matches));
  return { label, round, court, entrants, rules, matches, standings, ties: unresolvedTies(standings, matches) };
}

function seedRows(entrants, eloById) {
  return entrants.map((e) => ({ ...e, avp: e.avpRank ?? null, truvolley: e.truvolley ?? null, elo: eloById.get(e.profileId) ?? null }));
}

// finals: per final pool, { format, winners: ["a","b","a"] } (one per set
// to score; fewer than the format's sets leaves the rest unscored) or null.
function planFinal(rng, pool, { format, winners }, partnersFrom) {
  const [a1, b1] = pool.standings.map((r) => r.id);
  const others = partnersFrom.filter((id) => id !== a1 && id !== b1);
  const [a2, b2] = [others[0], others[1]];
  const sets = FINAL_FORMATS[format].sets.map((rules, i) => {
    const scores = winners[i] ? scoreFor(rng, rules, winners[i]) : null;
    return { rules, scoreA: scores?.[0] ?? null, scoreB: scores?.[1] ?? null };
  });
  return { a1, a2, b1, b2, sets };
}

// ---------------------------------------------------------------------------
// Writing, through the same tables/RPCs as src/lib/tournamentApi.js.
// ---------------------------------------------------------------------------

async function main() {
  const url = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url?.includes(STAGING_REF)) throw new Error(`seedStagingTournaments: refusing to run -- VITE_SUPABASE_URL isn't the staging project (${STAGING_REF}).`);

  const session = await getAdminSession();
  const adminId = session.user.id;
  const headers = { apikey: anonKey, Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" };
  // DRY_RUN=1 plans everything and fakes every write, to catch mistakes
  // before they land (a tournament can't be deleted once it's published).
  const dryRun = process.env.DRY_RUN === "1";
  const rest = async (path, { method = "GET", body, prefer } = {}) => {
    if (dryRun && method !== "GET") {
      console.log(`[dry run] ${method} ${path.split("?")[0]}${Array.isArray(body) ? ` x${body.length}` : ""}`);
      return prefer ? (Array.isArray(body) ? body : [body]).map((r) => ({ ...r, id: crypto.randomUUID() })) : null;
    }
    const res = await fetch(`${url}/rest/v1/${path}`, { method, headers: prefer ? { ...headers, Prefer: prefer } : headers, body: body && JSON.stringify(body) });
    const text = await res.text();
    if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${text}`);
    return text ? JSON.parse(text) : null;
  };
  const rpc = (name, body) => rest(`rpc/${name}`, { method: "POST", body });

  // Tournament-only players. "Sam Lee" is deliberately two profiles.
  const manual = await rest("profiles?select=id,display_name,elo_rating,elo_games_played&is_manual=eq.true");
  const wanted = new Map();
  for (const name of TOURNAMENT_ONLY) wanted.set(name, (wanted.get(name) || 0) + 1);
  const toCreate = [];
  for (const [name, count] of wanted) {
    const have = manual.filter((p) => p.display_name === name).length;
    for (let i = have; i < count; i++) toCreate.push({ display_name: name, is_manual: true, approved: true });
  }
  if (toCreate.length) {
    manual.push(...(await rest("profiles", { method: "POST", body: toCreate, prefer: "return=representation" })));
    console.log("Seeded profiles:", toCreate.map((p) => p.display_name).join(", "));
  }
  const byName = (name) => {
    const matches = manual.filter((p) => p.display_name === name);
    if (!matches.length) throw new Error(`seedStagingTournaments: no manual profile named ${name} -- run seedStagingGames.js first.`);
    return matches;
  };
  const one = (name) => byName(name)[0].id;
  const eloById = new Map(manual.filter((p) => p.elo_games_played > 0).map((p) => [p.id, p.elo_rating]));

  const existing = new Set((await rest("tournaments?select=name")).map((t) => t.name));
  // Entrant ids by tournament + profile. (splitIntoPools hands back copies
  // of the entrant objects, so ids can't just be stored on them.)
  const entrantIds = new Map();
  const entrantId = (tournamentId, profileId) => entrantIds.get(`${tournamentId}:${profileId}`);

  async function createTournament({ name, divisions, ...fields }) {
    const [t] = await rest("tournaments", { method: "POST", body: { name, ...fields, status: "draft", created_by: adminId }, prefer: "return=representation" });
    const divs = await rest("tournament_divisions", {
      method: "POST",
      body: divisions.map((d, i) => ({ tournament_id: t.id, name: d.name, sort_order: i })),
      prefer: "return=representation",
    });
    return { t, divIds: new Map(divs.map((d) => [d.name, d.id])) };
  }

  async function addEntrants(tournamentId, divisionId, entrants) {
    if (!entrants.length) return;
    const rows = await rest("tournament_entrants", {
      method: "POST",
      prefer: "return=representation",
      body: entrants.map((e) => ({
        tournament_id: tournamentId,
        division_id: divisionId,
        profile_id: e.profileId,
        checked_in: e.checkedIn ?? true,
        avp_rank: e.avpRank ?? null,
        truvolley_score: e.truvolley ?? null,
        is_junior: Boolean(e.junior),
      })),
    });
    rows.forEach((row) => entrantIds.set(`${tournamentId}:${row.profile_id}`, row.id));
    const contacts = entrants
      .filter((e) => e.email || e.phone)
      .map((e) => ({ entrant_id: entrantId(tournamentId, e.profileId), email: e.email ?? null, phone: e.phone ?? null }));
    if (contacts.length) await rest("tournament_entrant_contacts", { method: "POST", body: contacts });
  }

  // Same rows as tournamentApi.js savePools(), minus the delete (always a
  // fresh tournament here). Returns match ids in sequence order.
  async function savePool(tournamentId, divisionId, pool) {
    const [row] = await rest("tournament_pools", {
      method: "POST",
      prefer: "return=representation",
      body: { tournament_id: tournamentId, division_id: divisionId, round: pool.round, label: pool.label, court: pool.court ?? null },
    });
    pool.id = row.id;
    await rest("tournament_pool_players", { method: "POST", body: pool.entrants.map((e, seed) => ({ pool_id: row.id, entrant_id: entrantId(tournamentId, e.profileId), seed: seed + 1 })) });
    const ms = await rest("tournament_matches", {
      method: "POST",
      prefer: "return=representation",
      body: pool.matches.map((m, n) => ({
        tournament_id: tournamentId,
        division_id: divisionId,
        pool_id: row.id,
        stage: "pool",
        round: pool.round,
        sequence: n + 1,
        a1: m.a1,
        a2: m.a2,
        b1: m.b1,
        b2: m.b2,
        win_score: pool.rules.winScore,
        win_by_two: pool.rules.winByTwo,
        point_cap: pool.rules.pointCap,
      })),
    });
    ms.sort((a, b) => a.sequence - b.sequence).forEach((m, i) => (pool.matches[i].id = m.id));
  }

  async function saveFinal(tournamentId, divisionId, pool, final) {
    const ms = await rest("tournament_matches", {
      method: "POST",
      prefer: "return=representation",
      body: final.sets.map(({ rules }, i) => ({
        tournament_id: tournamentId,
        division_id: divisionId,
        pool_id: pool.id,
        stage: "final",
        round: pool.round,
        sequence: i + 1,
        a1: final.a1,
        a2: final.a2,
        b1: final.b1,
        b2: final.b2,
        win_score: rules.winScore,
        win_by_two: rules.winByTwo,
        point_cap: rules.pointCap,
      })),
    });
    ms.sort((a, b) => a.sequence - b.sequence).forEach((m, i) => (final.sets[i].id = m.id));
  }

  // Scores pools game by game, alternating between pools like courts
  // playing side by side.
  async function scorePools(pools) {
    const longest = Math.max(...pools.map((p) => p.matches.length));
    for (let n = 0; n < longest; n++) {
      for (const p of pools) {
        const m = p.matches[n];
        if (m?.scoreA != null) await rpc("submit_tournament_match_score", { p_match_id: m.id, p_score_a: m.scoreA, p_score_b: m.scoreB });
      }
    }
  }
  async function scoreFinal(final) {
    for (const s of final.sets) {
      if (s.scoreA != null) await rpc("submit_tournament_match_score", { p_match_id: s.id, p_score_a: s.scoreA, p_score_b: s.scoreB });
    }
  }
  const setStatus = (id, status) => rest(`tournaments?id=eq.${id}`, { method: "PATCH", body: { status } });

  const skill = (id) => skillOf(id);
  const entrant = (name, extra = {}) => ({ profileId: one(name), name, ...extra });

  // Simulates with seed 1, 2, 3... until `check` passes, so each
  // tournament reliably shows the edge cases it's meant to.
  function planUntil(build, check, label) {
    for (let seed = 1; seed < 20000; seed++) {
      const plan = build(makeRng(seed));
      if (check(plan)) return plan;
    }
    throw new Error(`seedStagingTournaments: couldn't plan ${label} with the edge cases it needs.`);
  }

  // ----- 1. Fall Classic 2026 (complete, ranked) ---------------------------
  const FALL = "Fall Classic 2026";
  if (existing.has(FALL)) {
    console.log(`${FALL}: already exists -- skipped.`);
  } else {
    const [samA, samB] = byName("Sam Lee").map((p) => p.id);
    const open = [
      entrant("Maya Torres", { avpRank: 12, email: "maya.torres@example.com", phone: "(321) 555-0101" }),
      entrant("Jordan Reyes", { avpRank: 40 }),
      entrant("Leo Martins", { avpRank: 40 }),
      entrant("Sam Whitaker", { truvolley: 71.5, email: "sam.w@example.com" }),
      entrant("Riley Chen", { truvolley: 64.25 }),
      entrant("Tessa Quinn", { truvolley: 64.25 }),
      entrant("Isla Moreno"),
      entrant("Owen Park"),
      entrant("Priya Nair", { phone: "321-555-0199" }),
      entrant("Shay O'Neil", { junior: true, truvolley: 88 }),
      entrant("Zoë Ramírez", { avpRank: 3, email: "zoe.ramirez@example.com" }),
      entrant("Mary-Kate Lin"),
      entrant("Bethany Van Der Berg", { junior: true }),
      entrant("Anastasia Papadopoulou", { truvolley: 12 }),
      { profileId: samA, name: "Sam Lee" },
      { profileId: samB, name: "Sam Lee", truvolley: 50 },
      entrant("Lani Kealoha", { checkedIn: false, email: "lani@example.com" }),
    ];
    const juniors = ["Jo", "Kiki", "Sierra Blake", "Tori Nguyen", "Camille Dubois"].map((n) => entrant(n, { junior: true }));
    const fallbackRules = { winScore: 21, winByTwo: true, pointCap: null };
    // Make the junior strong enough to reach the Gold final.
    const fallSkill = (id) => (id === one("Shay O'Neil") ? 0.97 : skill(id));

    const plan = planUntil(
      (rng) => {
        const checked = seedRows(open.filter((e) => e.checkedIn !== false), eloById);
        const r1 = splitIntoPools(checked, { targetSize: 4 }).map((entrants, i) =>
          planPool({ rng, entrants, label: poolLabel(i), round: 1, court: `Court ${i + 1}`, fallbackRules, skill: fallSkill }),
        );
        const r2Plan = planRound2(r1);
        const byProfile = new Map(open.map((e) => [e.profileId, e]));
        const r2 = r2Plan.tiers.map((tier, i) =>
          planPool({ rng, entrants: tier.map((r) => byProfile.get(r.id)), label: tierName(i), round: 2, court: r1[i].court, fallbackRules, skill: fallSkill }),
        );
        const finalShapes = [
          { format: "best_of_3", winners: ["a", "b", "a"] },
          { format: "best_of_3", winners: ["b", "b"] },
          { format: "one_set", winners: ["a"] },
          null,
        ];
        const finals = r2.map((p, i) => finalShapes[i] && planFinal(rng, p, finalShapes[i], p.standings.slice(2).map((r) => r.id)));
        const jr = planPool({ rng, entrants: juniors, label: "A", round: 1, court: "Court 5", fallbackRules, skill });
        const jrFinal = planFinal(rng, jr, { format: "one_set", winners: ["b"] }, jr.standings.slice(2).map((r) => r.id));
        return { r1, r2, finals, jr, jrFinal };
      },
      (p) => {
        const scores = [...p.r1, ...p.r2, p.jr].flatMap((pool) => pool.matches.map((m) => [m.scoreA, m.scoreB]));
        const capHit = scores.some(([a, b]) => Math.max(a, b) === 30 || Math.max(a, b) === 23);
        const goldFinalists = [p.finals[0].a1, p.finals[0].b1];
        // Clear top 2 in each final pool, so the finalists are unambiguous.
        const clearTop2 = [...p.r2, p.jr].every((pool) => pool.standings[1].place === 2 && pool.standings[2].place === 3);
        return capHit && clearTop2 && goldFinalists.includes(one("Shay O'Neil"));
      },
      FALL,
    );

    const { t, divIds } = await createTournament({
      name: FALL,
      event_date: "2026-10-11",
      location: "Paradise Beach Park, Melbourne Beach",
      ranked: true,
      divisions: [{ name: "Open" }, { name: "Juniors" }],
    });
    await addEntrants(t.id, divIds.get("Open"), open);
    await addEntrants(t.id, divIds.get("Juniors"), juniors);
    for (const pool of plan.r1) await savePool(t.id, divIds.get("Open"), pool);
    await savePool(t.id, divIds.get("Juniors"), plan.jr);
    await setStatus(t.id, "published");
    await setStatus(t.id, "live");
    await scorePools([...plan.r1, plan.jr]);
    for (const pool of plan.r2) await savePool(t.id, divIds.get("Open"), pool);
    await scorePools(plan.r2);
    for (const [i, final] of plan.finals.entries()) {
      if (!final) continue;
      await saveFinal(t.id, divIds.get("Open"), plan.r2[i], final);
      await scoreFinal(final);
    }
    await saveFinal(t.id, divIds.get("Juniors"), plan.jr, plan.jrFinal);
    await scoreFinal(plan.jrFinal);

    // Crown: same as ResultsView's defaults (Gold final winner is Queen).
    const crown = async (final) => {
      const aWon = final.sets.filter((s) => s.scoreA != null && s.scoreA > s.scoreB).length * 2 > final.sets.filter((s) => s.scoreA != null).length;
      const [queen, princess] = aWon ? [final.a1, final.b1] : [final.b1, final.a1];
      for (const [pid, title, place] of [
        [queen, "queen", 1],
        [princess, "princess", 2],
      ]) {
        await rest(`tournament_entrants?id=eq.${entrantId(t.id, pid)}`, { method: "PATCH", body: { title, final_place: place } });
      }
    };
    await crown(plan.finals[0]);
    await crown(plan.jrFinal);
    await setStatus(t.id, "complete");
    console.log(`${FALL}: seeded (complete).`);
  }

  // ----- 2. Halloween Bash (live, casual) -----------------------------------
  const BASH = "Halloween Bash";
  if (existing.has(BASH)) {
    console.log(`${BASH}: already exists -- skipped.`);
  } else {
    const open = ["Willow Hart", "Nora Feld", "Paige Turner", "Elena Petrova", "Skye Malone", "June Okafor", "Lucy Pham", "Lucas Ford", "Mia Santos", "Ruby Lane"].map(
      (n, i) => entrant(n, i % 3 === 0 ? { truvolley: 40 + i * 3 } : {}),
    );
    const rec = ["Ethan Ward", "Gabe Foster", "Hannah Lowe", "Zoe Kim", "Eli Brooks", "Theo Grant", "Marcus Hale"].map((n) => entrant(n));
    const masters = ["Felix Stone", "Grace Holt", "Ivy Marsh"].map((n) => entrant(n));
    // Not a 4 or 5, so a pool of 7 uses these.
    const fallbackRules = { winScore: 21, winByTwo: false, pointCap: null };

    const plan = planUntil(
      (rng) => {
        const r1 = splitIntoPools(seedRows(open, eloById), { targetSize: 5 }).map((entrants, i) =>
          planPool({ rng, entrants, label: poolLabel(i), round: 1, court: `Court ${i + 1}`, fallbackRules, skill }),
        );
        const r2Plan = planRound2(r1);
        const byProfile = new Map(open.map((e) => [e.profileId, e]));
        const r2 = r2Plan.tiers.map((tier, i) =>
          planPool({ rng, entrants: tier.map((r) => byProfile.get(r.id)), label: tierName(i), round: 2, court: r1[i].court, fallbackRules, skill, scoreUpTo: i === 0 ? 2 : 0 }),
        );
        const recPool = planPool({ rng, entrants: rec, label: "A", round: 1, court: "Court 3", fallbackRules, skill, scoreUpTo: 3 });
        return { r1, r2, r2Plan, recPool };
      },
      (p) => p.r1.some((pool) => pool.ties.length > 0) && p.r2Plan.method === "overall",
      BASH,
    );

    const { t, divIds } = await createTournament({
      name: BASH,
      event_date: "2026-10-23",
      location: "Paradise Beach Park",
      ranked: false,
      win_score: 21,
      win_by_two: false,
      point_cap: null,
      divisions: [{ name: "Open" }, { name: "Rec" }, { name: "Masters" }],
    });
    await addEntrants(t.id, divIds.get("Open"), open);
    await addEntrants(t.id, divIds.get("Rec"), rec);
    await addEntrants(t.id, divIds.get("Masters"), masters);
    for (const pool of plan.r1) await savePool(t.id, divIds.get("Open"), pool);
    await savePool(t.id, divIds.get("Rec"), plan.recPool);
    await setStatus(t.id, "published");
    await setStatus(t.id, "live");
    await scorePools([...plan.r1, plan.recPool]);
    for (const pool of plan.r2) await savePool(t.id, divIds.get("Open"), pool);
    await scorePools(plan.r2);
    // The next Gold game is mid-play. (It shows as "live" on the public
    // page for 10 minutes after this runs, then as upcoming with 14-12.)
    await rpc("update_tournament_match_live_score", { p_match_id: plan.r2[0].matches[2].id, p_score_a: 14, p_score_b: 12 });
    console.log(`${BASH}: seeded (live).`);
  }

  // ----- 3. Upcoming, published, long name ----------------------------------
  const WINTER = "Winter Wahine Invitational & Pro-Am Qualifier at Paradise Beach — Melbourne, FL";
  if (WINTER.length > 80) throw new Error("tournament names are limited to 80 characters");
  if (existing.has(WINTER)) {
    console.log(`${WINTER}: already exists -- skipped.`);
  } else {
    const open = ["Maya Torres", "Zoë Ramírez", "Shay O'Neil", "Riley Chen", "Kiki", "Jo", "Rosa Delgado", "Willow Hart", "Anastasia Papadopoulou"].map((n, i) =>
      entrant(n, i < 2 ? { avpRank: i + 1 } : {}),
    );
    const intermediate = ["Nora Feld", "Paige Turner", "Elena Petrova", "Skye Malone", "June Okafor", "Lucy Pham"].map((n, i) => entrant(n, { checkedIn: i < 4 }));
    const rng = makeRng(1);
    const fallbackRules = { winScore: 21, winByTwo: true, pointCap: null };
    const pools = splitIntoPools(seedRows(open, eloById), { targetSize: 5 }).map((entrants, i) =>
      planPool({ rng, entrants, label: poolLabel(i), round: 1, court: i === 0 ? "Court 1" : null, fallbackRules, skill, scoreUpTo: 0 }),
    );

    const { t, divIds } = await createTournament({
      name: WINTER,
      event_date: "2026-11-14",
      location: "Paradise Beach Park, 2301 N Highway A1A, Melbourne, FL 32903 — courts 1–4 by the north pavilion, parking lot B",
      ranked: true,
      divisions: [{ name: "Open" }, { name: "Intermediate" }, { name: "Beginners" }],
    });
    await addEntrants(t.id, divIds.get("Open"), open);
    await addEntrants(t.id, divIds.get("Intermediate"), intermediate);
    for (const pool of pools) await savePool(t.id, divIds.get("Open"), pool);
    await setStatus(t.id, "published");
    console.log(`${WINTER}: seeded (published).`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
