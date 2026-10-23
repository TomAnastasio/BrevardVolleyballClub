import { expect, test } from "@playwright/test";
import { ADMIN_NAME, getAdminSession, signInAsAdmin, signInAsPlayer } from "./signInAsTestUser.js";

// The admin-only "Display name ✏️ Edit" in the Admin only box on a profile
// (admin_set_display_name()). Renames the admin bot itself, since other
// specs pick players by name and staging's demo players are permanent, then
// renames it back. afterAll puts ADMIN_NAME back even if a step failed, so
// a broken run can't leave the bot misnamed for every other spec.
const TEMP_NAME = "TestBotAdmin Renamed";

test.afterAll(async () => {
  const session = await getAdminSession();
  await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/rpc/admin_set_display_name`, {
    method: "POST",
    headers: {
      apikey: process.env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_profile_id: session.user.id, p_display_name: ADMIN_NAME }),
  });
});

test("admin can rename a player from their profile, and it sticks", async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto("/");
  await page.getByRole("button", { name: "My profile" }).click();

  await page.getByRole("button", { name: "Edit display name" }).click({ timeout: 20_000 });
  await page.getByLabel("New display name").fill(`  ${TEMP_NAME}  `);
  await page.getByRole("button", { name: "Save name" }).click();

  // Trimmed server-side, and the page header follows straight away.
  await expect(page.getByText(TEMP_NAME, { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit display name" })).toBeVisible();

  // Really saved, not just local state: a fresh load shows it.
  await page.reload();
  await page.getByRole("button", { name: "My profile" }).click();
  await expect(page.getByText(TEMP_NAME, { exact: true }).first()).toBeVisible({ timeout: 20_000 });

  await page.getByRole("button", { name: "Edit display name" }).click();
  await page.getByLabel("New display name").fill(ADMIN_NAME);
  await page.getByRole("button", { name: "Save name" }).click();
  await expect(page.getByText(ADMIN_NAME, { exact: true }).first()).toBeVisible();
});

test("players don't get the rename control", async ({ page }) => {
  await signInAsPlayer(page);
  await page.goto("/");
  await page.getByRole("button", { name: "My profile" }).click();
  await expect(page.getByRole("button", { name: "Change profile photo" })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("button", { name: "Edit display name" })).toHaveCount(0);
});
