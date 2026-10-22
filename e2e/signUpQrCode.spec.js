import { expect, test } from "@playwright/test";
import { signInAsAdmin } from "./signInAsTestUser.js";

// Covers both ends of the admin "Sign-Up QR Code" flow: the admin screen
// shows a QR code for the `?join=1` link, and a signed-out visitor opening
// that link is sent straight into Google OAuth. The OAuth hop itself can't be
// completed here (real Google), so this stops at confirming the redirect.
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
