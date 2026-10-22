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
