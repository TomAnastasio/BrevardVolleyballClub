import { expect, test } from "@playwright/test";
import { getAdminSession, PLAYER_NAME, signInAsAdmin, signInAsPlayer } from "./signInAsTestUser.js";

// Queen of the Court past round 1: 8 players in two pools of 4 (games to
// 28), round 2 Gold/Silver pools, a best-of-3 Gold final where set 3 isn't
// needed after 2-0, a regular member's live view, and crowning. The
// setup and the many scores go through the admin bot's normal API access
// (the UI for scoring is covered by tournament.spec.js); the screens under
// test are driven in the browser. Uses existing staging profiles, is
// unranked, and removes its games and tournament afterward. Needs migration
// 20261022200000 on staging.

test("round 2, best-of-3 final, crowning", async ({ page, browser }) => {
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
  const scoreAll = async (tid, filter) => {
    const ms = await rest(`tournament_matches?tournament_id=eq.${tid}&game_id=is.null&${filter}&order=pool_id,sequence`);
    let i = 0;
    for (const m of ms) await rest("rpc/submit_tournament_match_score", { method: "POST", body: { p_match_id: m.id, p_score_a: 28, p_score_b: 15 + (i++ % 10) } });
    return ms.length;
  };

  const name = `E2E Round2 ${Date.now()}`;
  const profiles = await rest("profiles?select=id,display_name&display_name=not.is.null&order=display_name");
  const player = profiles.find((p) => p.display_name === PLAYER_NAME);
  const picks = [player, ...profiles.filter((p) => p.id !== player.id && p.display_name !== "TestBotAdmin").slice(0, 7)];
  expect(new Set(picks.map((p) => p.id)).size).toBe(8);
  const [t] = await rest("tournaments", { method: "POST", body: { name, event_date: "2026-10-31", ranked: false, created_by: session.user.id }, prefer: "return=representation" });
  let tid = t.id;
  try {
    const [d] = await rest("tournament_divisions", { method: "POST", body: { tournament_id: tid, name: "E2E Open" }, prefer: "return=representation" });
    await rest("tournament_entrants", { method: "POST", body: picks.map((p, i) => ({ tournament_id: tid, division_id: d.id, profile_id: p.id, checked_in: true, avp_rank: i < 3 ? i + 1 : null, is_junior: i === 7 })) });

    await signInAsAdmin(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/?t=${tid}`);
    await page.getByRole("button", { name: "🛠️ Manage tournament" }).click();
    await page.getByRole("button", { name: "Pools & schedule" }).click();
    await page.getByRole("combobox", { name: /Pool size/ }).selectOption("4");
    await page.getByRole("button", { name: /Preview pools \(8 players\)/ }).click();
    await expect(page.getByText("Pool A · 4 players · 3 games to 28, win by 2, cap 30")).toBeVisible();
    await page.getByRole("button", { name: "Save pools" }).click();
    await expect(page.getByText("✓ Pools and game order saved")).toBeVisible();
    await page.getByRole("button", { name: `‹ ${name}` }).click();
    await page.getByRole("button", { name: "Publish (post pools publicly)" }).click();
    await page.getByRole("button", { name: "Start tournament (open scoring)" }).click();
    await expect(page.getByText("Live now")).toBeVisible();

    expect(await scoreAll(tid, "round=eq.1")).toBe(6);
    await page.getByRole("button", { name: "Pools & schedule" }).click();
    await page.getByRole("button", { name: "Preview round 2" }).click();
    await expect(page.getByText("Gold pool · 4 players · 3 games to 28")).toBeVisible();
    await page.getByRole("button", { name: "Save round 2" }).click();
    await expect(page.getByText("✓ Pools and game order saved")).toBeVisible();
    expect(await scoreAll(tid, "round=eq.2")).toBe(6);

    await page.getByRole("button", { name: `‹ ${name}` }).click();
    await page.getByRole("button", { name: "Finals" }).click();
    await page.reload();
    await page.getByRole("button", { name: "🛠️ Manage tournament" }).click();
    await page.getByRole("button", { name: "Finals" }).click();
    await page.getByLabel("E2E Open Gold final: Finalist 1's partner").selectOption({ index: 1 });
    await page.getByLabel("E2E Open Gold final: Finalist 2's partner").selectOption({ index: 1 });
    await page.getByRole("button", { name: "Set up gold final" }).click();
    await expect(page.getByText(/Set 3 \(to 15, win by 2, no cap\)/)).toBeVisible();
    // Gold final sets 1 and 2 to team A -> set 3 not needed.
    const golds = await rest(`tournament_matches?tournament_id=eq.${tid}&stage=eq.final&order=sequence`);
    for (const m of golds.slice(0, 2)) await rest("rpc/submit_tournament_match_score", { method: "POST", body: { p_match_id: m.id, p_score_a: 21, p_score_b: 17 } });
    await page.getByRole("button", { name: `‹ ${name}` }).click();
    await page.getByRole("button", { name: "Finals" }).click();
    await expect(page.getByText("Set 3 (to 15, win by 2, no cap): not needed")).toBeVisible();

    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const pp = await ctx.newPage();
    await signInAsPlayer(pp);
    await pp.goto(`/?t=${tid}`);
    await expect(pp.getByText("sets 2–0")).toBeVisible({ timeout: 20_000 });
    await expect(pp.getByText("Set 3")).toHaveCount(0);
    await ctx.close();

    await page.getByRole("button", { name: `‹ ${name}` }).click();
    await page.getByRole("button", { name: "Crown the winners" }).click();
    await expect(page.getByLabel("E2E Open queen")).not.toHaveValue("");
    await page.getByRole("button", { name: "Crown winners & finish tournament" }).click();
    await expect(page.getByText("Final results")).toBeVisible();
    await page.goto(`/?t=${tid}`);
    await expect(page.getByText(/👑 Queen · /)).toBeVisible({ timeout: 20_000 });

    // Its games are tagged by stage in Past Games (as the admin, whose
    // full-card Edit button must not swallow the tag's tap) and the tag
    // opens the tournament.
    const tag = (label) => page.getByRole("button", { name: `Open tournament: ${name} · ${label}` });
    await page.goto("/");
    await page.getByRole("button", { name: "Game tracking" }).click();
    await page.getByRole("button", { name: "Past Games" }).click();
    await expect(tag("Final")).toHaveCount(2, { timeout: 20_000 });
    await expect(tag("Pool play · Round 2")).toHaveCount(6);
    await expect(tag("Pool play · Round 1")).toHaveCount(6);
    await tag("Final").first().click();
    await expect(page.getByRole("heading", { name })).toBeVisible({ timeout: 20_000 });

    // And on a player's profile.
    await page.goto("/");
    await page.getByRole("button", { name: "Rankings" }).click();
    await expect(page.getByText("Loading rankings…")).toHaveCount(0, { timeout: 20_000 });
    const unranked = page.getByRole("button", { name: /Unranked players/ });
    if (await unranked.count()) await unranked.click();
    await page.getByRole("button", { name: `View ${PLAYER_NAME}'s profile` }).click();
    await expect(tag("Pool play · Round 1")).toHaveCount(3, { timeout: 20_000 });
    await tag("Pool play · Round 1").first().click();
    await expect(page.getByRole("heading", { name })).toBeVisible({ timeout: 20_000 });
  } finally {
    const scored = await rest(`tournament_matches?tournament_id=eq.${tid}&game_id=not.is.null&select=game_id`);
    for (const m of scored) await rest("rpc/admin_delete_game", { method: "POST", body: { p_game_id: m.game_id } });
    await rest(`tournaments?id=eq.${tid}`, { method: "PATCH", body: { status: "draft" } });
    await rest(`tournaments?id=eq.${tid}`, { method: "DELETE" });
    const left = await rest(`tournaments?id=eq.${tid}&select=id`);
    expect(left).toHaveLength(0);
  }
});
