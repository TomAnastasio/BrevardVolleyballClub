import { expect, test } from "@playwright/test";
import { PLAYER_NAME, signInAsPlayer } from "./signInAsTestUser.js";

// The home screen's top-right corner: your photo opens your own profile
// once signed in; signed out, it's a "Sign in" button that comes back to
// your profile after Google.

test("signed in, the corner photo opens your own profile and Menu goes home", async ({ page }) => {
  await signInAsPlayer(page);
  await page.goto("/");
  await page.getByRole("button", { name: "My profile" }).click();
  await expect(page.getByText(PLAYER_NAME, { exact: true })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("button", { name: "Change profile photo" })).toBeVisible();
  await page.getByRole("button", { name: "Back to main menu" }).click();
  await expect(page.getByRole("button", { name: "Game tracking" })).toBeVisible();
});

test("signed out, the corner says Sign in and starts Google sign-in", async ({ page }) => {
  // Stop at Supabase's authorize endpoint instead of hitting Google.
  await page.route("**/auth/v1/authorize**", (route) => route.fulfill({ status: 200, body: "stubbed" }));
  await page.goto("/");
  await expect(page.getByRole("button", { name: "My profile" })).toHaveCount(0);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(/\/auth\/v1\/authorize\?provider=google/);
});

test("coming back from that sign-in opens your own profile", async ({ page }) => {
  // The return leg: now signed in, with the breadcrumb the Sign in button
  // wrote right before the redirect waiting in sessionStorage.
  await signInAsPlayer(page);
  await page.goto("/");
  await page.evaluate(() =>
    sessionStorage.setItem("bvc-pending-my-profile", JSON.stringify({ expiresAt: Date.now() + 60_000 })),
  );
  await page.reload();
  await expect(page.getByRole("button", { name: "Back to main menu" })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(PLAYER_NAME, { exact: true })).toBeVisible();
});

test("profile shows partners & rivals, and the Elo chart for a ranked player", async ({ page }) => {
  // The test bot itself has no ranked games (giving it some would move the
  // demo players' Elo), so its profile and Elo history are faked at the
  // network layer: the bot "has" 3 ranked games. Real staging ranked games
  // are covered by profileEloChange.spec.js.
  await signInAsPlayer(page);
  await page.route("**/rest/v1/profiles?select=id%2Cdisplay_name%2Cavatar_url%2Celo_rating%2Celo_games_played*", async (route) => {
    const res = await route.fetch();
    const rows = await res.json();
    await route.fulfill({
      response: res,
      json: rows.map((p) => (p.display_name === PLAYER_NAME ? { ...p, elo_rating: 1524, elo_games_played: 3 } : p)),
    });
  });
  const hist = (id, date, before, after) => ({
    game_id: id,
    rating_before: before,
    rating_after: after,
    delta: after - before,
    games: { played_date: date, played_time: "18:00", created_at: `${date}T22:00:00Z` },
  });
  await page.route("**/rest/v1/elo_history?*", (route) =>
    route.fulfill({
      json: [
        hist("00000000-0000-0000-0000-000000000001", "2026-10-01", 1500, 1512),
        hist("00000000-0000-0000-0000-000000000002", "2026-10-08", 1512, 1503),
        hist("00000000-0000-0000-0000-000000000003", "2026-10-15", 1503, 1524),
      ],
    }),
  );

  await page.goto("/");
  await page.getByRole("button", { name: "My profile" }).click();
  await expect(page.getByText("1524 Elo")).toBeVisible({ timeout: 20_000 });
  const chart = page.getByRole("img", { name: /Elo over 3 ranked games, from 1500 to 1524/ });
  await expect(chart).toBeVisible();
  await chart.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("status").filter({ hasText: "Game 3" })).toContainText("1524");
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("status").filter({ hasText: "Game 2" })).toContainText("(-9)");

  // The bot's staging games (scoreboard.spec.js) are with Bob vs Carla & Dana.
  await expect(page.getByRole("heading", { name: "Partners & rivals" })).toBeVisible();
  await page.getByRole("button", { name: /^Most frequent partner: / }).click();
  await expect(page.getByRole("button", { name: "Back", exact: true })).toBeVisible();
  // .last(): your own profile is still mounted (hidden) underneath.
  await expect(page.getByText("Overall", { exact: true }).last()).toBeVisible({ timeout: 20_000 });
});
