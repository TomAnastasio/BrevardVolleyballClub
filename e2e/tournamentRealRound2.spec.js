import { expect, test } from "@playwright/test";
import { getAdminSession, signInAsAdmin } from "./signInAsTestUser.js";

// Recording a round 2 that ran differently from how the app set it up: four
// pools renamed and reordered with scores in them, then one-set finals across
// pools, entered after the winners were crowned. Unranked (so no staging Elo
// moves), on existing staging profiles, and removes everything it created.
// Needs migration 20261104120000 on staging.

test("rename and reorder round 2, cross-pool finals, crowns untouched", async ({ page }) => {
  test.setTimeout(240_000);
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  const session = await getAdminSession();
  const rest = async (path, { method = "GET", body, prefer } = {}) => {
    const res = await fetch(`${url}/rest/v1/${path}`, {
      method,
      headers: { apikey: key, Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json", ...(prefer ? { Prefer: prefer } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${text}`);
    return text ? JSON.parse(text) : null;
  };
  const insert = (table, body) => rest(table, { method: "POST", body, prefer: "return=representation" });

  const name = `E2E Real Round2 ${Date.now()}`;
  const profiles = await rest("profiles?select=id,display_name&display_name=not.is.null&order=display_name");
  // Unique names only: staging has same-name demo players on purpose, and
  // this test finds players by name.
  const count = (n) => profiles.filter((p) => p.display_name === n).length;
  const picks = profiles.filter((p) => p.display_name !== "TestBotAdmin" && count(p.display_name) === 1).slice(0, 16);
  expect(picks).toHaveLength(16);
  const [t] = await insert("tournaments", { name, event_date: "2026-10-31", ranked: false, status: "live", created_by: session.user.id });
  const tid = t.id;
  try {
    const [d] = await insert("tournament_divisions", { tournament_id: tid, name: "E2E Open" });
    const entrants = await insert("tournament_entrants", picks.map((p) => ({ tournament_id: tid, division_id: d.id, profile_id: p.id, checked_in: true })));
    const entrantFor = (p) => entrants.find((e) => e.profile_id === p.id);

    // Two empty round 1 pools (the Round 2 section needs a round 1 to follow),
    // then four round 2 pools of 4 in the app's tier names, as it would build them.
    await insert("tournament_pools", ["A", "B"].map((label) => ({ tournament_id: tid, division_id: d.id, round: 1, label })));
    const tiers = ["Gold", "Silver", "Bronze", "Copper"];
    const poolIds = {};
    const rosters = {};
    const games = {};
    for (const [i, label] of tiers.entries()) {
      const players = picks.slice(i * 4, i * 4 + 4);
      const [pool] = await insert("tournament_pools", { tournament_id: tid, division_id: d.id, round: 2, label, court: `Court ${i + 1}` });
      await insert("tournament_pool_players", players.map((p, seed) => ({ pool_id: pool.id, entrant_id: entrantFor(p).id, seed: seed + 1 })));
      const [a, b, c, e] = players.map((p) => p.id);
      games[label] = await insert("tournament_matches", [
        [a, b, c, e], [a, c, b, e], [a, e, b, c],
      ].map(([a1, a2, b1, b2], n) => ({ tournament_id: tid, division_id: d.id, pool_id: pool.id, stage: "pool", round: 2, sequence: n + 1, a1, a2, b1, b2, win_score: 28, win_by_two: true, point_cap: 30 })));
      poolIds[label] = pool.id;
      rosters[label] = players;
    }
    for (const label of tiers) {
      for (const [n, m] of games[label].entries()) {
        await rest("rpc/submit_tournament_match_score", { method: "POST", body: { p_match_id: m.id, p_score_a: 28, p_score_b: 15 + n } });
      }
    }
    const snapshot = () => rest(`tournament_matches?tournament_id=eq.${tid}&stage=eq.pool&select=id,pool_id,a1,a2,b1,b2,game_id,game:games(score_a,score_b)&order=id`);
    const before = await snapshot();

    // Already crowned: the state the real tournament is in.
    const queen = entrantFor(rosters.Gold[0]);
    const princess = entrantFor(rosters.Silver[0]);
    await rest(`tournament_entrants?id=eq.${queen.id}`, { method: "PATCH", body: { title: "queen", final_place: 1 } });
    await rest(`tournament_entrants?id=eq.${princess.id}`, { method: "PATCH", body: { title: "princess", final_place: 2 } });
    await rest(`tournaments?id=eq.${tid}`, { method: "PATCH", body: { status: "complete" } });
    const crowns = () => rest(`tournament_entrants?tournament_id=eq.${tid}&title=not.is.null&select=id,title,final_place&order=id`);
    const crownsBefore = await crowns();

    await signInAsAdmin(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/?t=${tid}`);
    await page.getByRole("button", { name: "🛠️ Manage tournament" }).click();
    await page.getByRole("button", { name: "Pools & schedule" }).click();

    // Rename in the awkward order: one at a time, so every step has a mix of
    // old and new names. No pool may move while that happens.
    const order = () => page.getByRole("textbox", { name: /^Name for / }).evaluateAll((els) => els.map((el) => el.value));
    const rename = async (from, to) => {
      await page.getByLabel(`Name for ${from} pool`).fill(to);
      await page.getByLabel(`Court for ${from} pool`).focus();
      await expect(page.getByText(new RegExp(`^${to} · 4 players`))).toBeVisible();
    };
    await rename("Gold", "Gold Pool A");
    expect(await order()).toEqual(["Gold Pool A", "Silver", "Bronze", "Copper"]);
    await rename("Silver", "Gold Pool B");
    expect(await order()).toEqual(["Gold Pool A", "Gold Pool B", "Bronze", "Copper"]);
    await rename("Copper", "Silver Pool A");
    expect(await order()).toEqual(["Gold Pool A", "Gold Pool B", "Bronze", "Silver Pool A"]);
    await rename("Bronze", "Silver Pool B");
    expect(await order()).toEqual(["Gold Pool A", "Gold Pool B", "Silver Pool B", "Silver Pool A"]);

    // Same name twice: refused in words, and the box goes back.
    await page.getByLabel("Name for Silver Pool B").fill("Gold Pool A");
    await page.getByLabel("Court for Silver Pool B").focus();
    await expect(page.getByText("Another pool in this round already has that name.")).toBeVisible();
    await expect(page.getByLabel("Name for Silver Pool B")).toHaveValue("Silver Pool B");

    // Reorder, and fix a court.
    await page.getByRole("button", { name: "Move Silver Pool A up" }).click();
    await expect.poll(order).toEqual(["Gold Pool A", "Gold Pool B", "Silver Pool A", "Silver Pool B"]);
    await page.getByLabel("Court for Silver Pool A").fill("Court 4");
    await page.getByLabel("Name for Silver Pool A").focus();
    await expect(page.getByText(/12 round 2 games have a score, so these pools can't be replaced/)).toBeVisible();

    // Nothing about the games moved.
    expect(await snapshot()).toEqual(before);
    const courts = await rest(`tournament_pools?tournament_id=eq.${tid}&round=eq.2&select=label,court,sort_order&order=sort_order`);
    expect(courts.map((p) => [p.label, p.court])).toEqual([
      ["Gold Pool A", "Court 1"],
      ["Gold Pool B", "Court 2"],
      ["Silver Pool A", "Court 4"],
      ["Silver Pool B", "Court 3"],
    ]);

    // Finals screen: four forms until the first final exists.
    await page.getByRole("button", { name: `‹ ${name}` }).click();
    await page.getByRole("button", { name: "Finals" }).click();
    const nameOf = (p) => p.display_name;
    const [grace, lily] = rosters.Gold;
    const [carla, haley] = rosters.Silver;
    const [kelly] = rosters.Copper;
    const [kyra, josie, lola] = rosters.Bronze;

    // Finalists stay in the pool until the admin says otherwise.
    const f1 = page.getByLabel("E2E Open Gold Pool A final: Finalist 2", { exact: true });
    await expect(f1.locator("option", { hasText: nameOf(carla) })).toHaveCount(0);
    await expect(f1.locator("option", { hasText: `${nameOf(lily)} (` })).toHaveCount(1);

    await page.getByLabel("E2E Open Gold Pool A final: name").fill("Gold final");
    await page.getByLabel("E2E Open Gold Pool A final: finalists from any pool").check();
    await expect(f1.locator("option", { hasText: `${nameOf(carla)} (Gold Pool B` })).toHaveCount(1);
    await page.getByLabel("E2E Open Gold Pool A final: Finalist 1", { exact: true }).selectOption(grace.id);
    await f1.selectOption(carla.id);
    await page.getByLabel("E2E Open Gold Pool A final: Finalist 1's partner").selectOption(lily.id);
    await page.getByLabel("E2E Open Gold Pool A final: Finalist 2's partner").selectOption(haley.id);
    const goldCard = page.locator("div", { has: page.getByRole("button", { name: "Set up gold final" }) }).last();
    await goldCard.getByRole("combobox").last().selectOption("one_set");
    await page.getByRole("button", { name: "Set up gold final" }).click();
    await expect(page.getByText("Set 1 (to 21, win by 2, no cap): not played yet")).toBeVisible();

    // With one final set up, the other pools stop asking for finals.
    await expect(page.getByText("Gold Pool B: no final")).toBeVisible();
    await expect(page.getByText("Silver Pool B: no final")).toBeVisible();
    await expect(page.getByLabel(/Gold Pool B final: Finalist 1$/)).toHaveCount(0);

    await page.getByRole("button", { name: "Set up a final for Silver Pool A" }).click();
    await page.getByLabel("E2E Open Silver Pool A final: name").fill("Silver final");
    await page.getByLabel("E2E Open Silver Pool A final: finalists from any pool").check();
    await page.getByLabel("E2E Open Silver Pool A final: Finalist 1", { exact: true }).selectOption(kyra.id);
    await page.getByLabel("E2E Open Silver Pool A final: Finalist 2", { exact: true }).selectOption(kelly.id);
    await page.getByLabel("E2E Open Silver Pool A final: Finalist 1's partner").selectOption(josie.id);
    await page.getByLabel("E2E Open Silver Pool A final: Finalist 2's partner").selectOption(lola.id);
    const silverCard = page.locator("div", { has: page.getByRole("button", { name: "Set up silver final" }) }).last();
    await silverCard.getByRole("combobox").last().selectOption("one_set");
    await page.getByRole("button", { name: "Set up silver final" }).click();
    await expect(page.getByText("Set 1 (to 21, win by 2, no cap): not played yet")).toHaveCount(2);
    expect(await crowns()).toEqual(crownsBefore);

    // Reopen scoring and type both scores in, as an admin would.
    await page.getByRole("button", { name: `‹ ${name}` }).click();
    await page.getByRole("button", { name: "Reopen scoring" }).click();
    await expect(page.getByText("Live now")).toBeVisible();
    expect(await crowns()).toEqual(crownsBefore);

    const enter = async (a, b, teamA, teamB) => {
      await page.goto(`/?t=${tid}`);
      await page.getByRole("button", { name: `Final: ${teamA} vs ${teamB}. Keep score` }).click();
      await page.getByRole("button", { name: "Already finished? Type the final score" }).click();
      await page.getByLabel(teamA).fill(String(a));
      await page.getByLabel(teamB).fill(String(b));
      await page.getByRole("button", { name: "Review score" }).click();
      await expect(page.getByText("doesn't look like a finished game")).toHaveCount(0);
      await page.getByRole("button", { name: "Yes, submit" }).click();
      await expect(page.getByText(`Saved: ${teamA} ${a} – ${b} ${teamB}`)).toBeVisible({ timeout: 20_000 });
    };
    const team = (x, y) => `${nameOf(x)} & ${nameOf(y)}`;
    await enter(21, 18, team(grace, lily), team(carla, haley));
    await enter(21, 11, team(kyra, josie), team(kelly, lola));
    expect(await crowns()).toEqual(crownsBefore);

    // Finish again: the crowns come back as they were.
    await page.getByRole("button", { name: "🛠️ Manage tournament" }).click();
    await page.getByRole("button", { name: "Crown winners & finish" }).click();
    await expect(page.getByLabel("E2E Open queen")).toHaveValue(queen.id);
    await expect(page.getByLabel("E2E Open princess")).toHaveValue(princess.id);
    await page.getByRole("button", { name: "Crown winners & finish tournament" }).click();
    await expect(page.getByText("Final results")).toBeVisible();
    expect(await crowns()).toEqual(crownsBefore);
    expect(await snapshot()).toEqual(before);

    // The public page, signed out: real names, real order, only real finals.
    const ctx = await page.context().browser().newContext({ viewport: { width: 390, height: 844 } });
    const pub = await ctx.newPage();
    await pub.goto(`/?t=${tid}`);
    await expect(pub.getByRole("heading", { name: "Gold final" })).toBeVisible({ timeout: 20_000 });
    await expect(pub.getByRole("heading", { name: "Silver final" })).toBeVisible();
    await expect(pub.getByText("For the crown 👑")).toHaveCount(1);
    await expect(pub.getByRole("heading", { level: 3, name: /final$/ })).toHaveCount(2);
    const headings = await pub.getByRole("heading", { level: 3 }).allTextContents();
    expect(headings).toEqual([
      "Gold final",
      "Silver final",
      "Round 2 · Gold Pool A · Court 1",
      "Round 2 · Gold Pool B · Court 2",
      "Round 2 · Silver Pool A · Court 4",
      "Round 2 · Silver Pool B · Court 3",
      "Round 1 · Pool A",
      "Round 1 · Pool B",
    ]);
    await expect(pub.getByText(`🏆 ${team(grace, lily)}`)).toBeVisible();
    await expect(pub.getByText(`🏆 ${team(kyra, josie)}`)).toBeVisible();
    await ctx.close();
  } finally {
    const scored = await rest(`tournament_matches?tournament_id=eq.${tid}&game_id=not.is.null&select=game_id`);
    for (const m of scored) await rest("rpc/admin_delete_game", { method: "POST", body: { p_game_id: m.game_id } });
    await rest(`tournaments?id=eq.${tid}`, { method: "PATCH", body: { status: "draft" } });
    await rest(`tournaments?id=eq.${tid}`, { method: "DELETE" });
    expect(await rest(`tournaments?id=eq.${tid}&select=id`)).toHaveLength(0);
  }
});
