import { expect, test } from "@playwright/test";
import { PLAYER_NAME, signInAsAdmin, signInAsPlayer } from "./signInAsTestUser.js";

// Covers both ends of the admin "Sign-Up QR Code" flow: the admin screen
// shows a QR code for the `?join=1` link, and a signed-out visitor opening
// that link is sent straight into Google OAuth, then lands on their own
// profile once back. The real Google hop in between can't be completed from
// a test, so the two legs are checked separately.
test("admin sees a sign-up QR code pointing at the join link", async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto("/");

  await page.getByRole("button", { name: "Admin Panel" }).click();
  await page.getByRole("button", { name: "Sign-Up QR Code" }).click();

  await expect(page.getByRole("img", { name: "Sign-up QR code" })).toBeVisible();
  await expect(page.getByText("http://localhost:5173/?join=1")).toBeVisible();
});

test("opening the join link signed out goes straight to Google sign-in", async ({ page }) => {
  // Stop the navigation at Supabase's authorize endpoint instead of actually
  // hitting Google from a test run.
  await page.route("**/auth/v1/authorize**", (route) => route.fulfill({ status: 200, body: "stubbed" }));
  await page.goto("/?join=1");
  await page.waitForURL(/\/auth\/v1\/authorize\?provider=google/);
});

test("coming back from Google sign-in lands on the player's own profile", async ({ page }) => {
  // Simulates the return leg of the OAuth round trip: the player is now
  // signed in, and WelcomeView's breadcrumb (written right before the
  // redirect to Google) is waiting in sessionStorage.
  await signInAsPlayer(page);
  await page.goto("/");
  await page.evaluate(() =>
    sessionStorage.setItem("bvc-just-joined", JSON.stringify({ expiresAt: Date.now() + 60_000 })),
  );
  await page.reload();

  await expect(page.getByRole("button", { name: "Back to rankings" })).toBeVisible();
  await expect(page.getByText(PLAYER_NAME, { exact: true })).toBeVisible();
});
