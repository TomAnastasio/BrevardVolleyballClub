import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { PLAYER_NAME, signInAsPlayer } from "./signInAsTestUser.js";

// The pixel avatar's screens: the profile card, the Locker and the Cauldron.
// The first test uses the bot's real staging tokens and outfit. The others
// fake the bot's tokens, items and outfit at the network layer (a real brew
// spends a token, and tokens only come from ranked games), and check what
// the app asks the database to do.

const sql = readFileSync(new URL("../supabase/migrations/20261024200000_tokens_items_and_pulls.sql", import.meta.url), "utf8");
const CATALOG = new Map(
  [...sql.matchAll(/^\s*\('([^']+)', '(\w+)', '(\w+)', '((?:[^']|'')+)'/gm)].map((m) => [m[1], { key: m[1], slot: m[2], tier: m[3], name: m[4].replace(/''/g, "'") }]),
);
const HAT = "head/witch-hat/legendary/ghostfire";
const TEE = "shirt/skeleton-tee/common/classic-ribcage-black";
const SOCKS = "pants/witch-stockings/rare/mismatched";
const MONSTER = [...CATALOG.values()].find((i) => i.slot === "transformation" && i.tier === "epic").key;
const PRIZE = "head/pumpkin-helmet/epic/chomper";

// Fakes the bot's loot. Returns the database calls the app made.
async function fakeLoot(page, { tokens = 3, owned = [HAT, TEE, SOCKS, MONSTER], outfit = { head: HAT, shirt: TEE }, fresh = [HAT] } = {}) {
  const calls = [];
  const json = (route, body) => route.fulfill({ json: body });
  await page.route("**/rest/v1/rpc/my_tokens", (route) => json(route, { balance: tokens, earned: tokens, spent: 0 }));
  await page.route("**/rest/v1/player_items?*", (route) =>
    json(
      route,
      owned.map((key) => {
        const { name, slot, tier } = CATALOG.get(key);
        return { item_key: key, obtained_at: "2026-10-24T20:00:00Z", seen_at: fresh.includes(key) ? null : "2026-10-24T20:00:00Z", cosmetic_items: { name, slot, tier } };
      }),
    ),
  );
  // Remembers changes the way equip_item/unequip do, since the app reloads the outfit after each.
  let worn = { head: null, shirt: null, pants: null, shoes: null, transformation: null, avatar: 1, skin: 2, ...outfit };
  await page.route("**/rest/v1/player_outfits?*", (route) => json(route, worn));
  await page.route("**/rest/v1/cosmetic_items?*", (route) => json(route, [...CATALOG.values()].filter((i) => Object.values(outfit).includes(i.key))));
  for (const fn of ["brew", "equip_item", "unequip", "set_look", "mark_items_seen"])
    await page.route(`**/rest/v1/rpc/${fn}`, (route) => {
      calls.push({ fn, args: route.request().postDataJSON() });
      if (fn === "brew") return json(route, { ...CATALOG.get(PRIZE), balance: tokens - 1 });
      const args = route.request().postDataJSON();
      if (fn === "equip_item") {
        const { slot } = CATALOG.get(args.p_key);
        worn = { ...worn, [slot]: args.p_key, ...(slot === "transformation" ? {} : { transformation: null }) };
      }
      if (fn === "unequip") worn = { ...worn, [args.p_slot]: null };
      if (fn === "set_look") worn = { ...worn, avatar: args.p_avatar, skin: args.p_skin };
      return route.fulfill({ status: 204, body: "" });
    });
  return calls;
}

async function openMyProfile(page) {
  await page.goto("/");
  await page.getByRole("button", { name: "My profile" }).click();
  await expect(page.getByText(PLAYER_NAME, { exact: true })).toBeVisible({ timeout: 20_000 });
}

test("profile card shows your tokens and opens the Locker and the Cauldron (real staging data)", async ({ page }) => {
  await signInAsPlayer(page);
  await openMyProfile(page);
  const card = page.getByRole("region", { name: `${PLAYER_NAME}'s avatar` });
  await expect(card.getByText(/^(No tokens yet|\d+ tokens? to brew)$/)).toBeVisible({ timeout: 20_000 });
  await card.getByRole("button", { name: "Change outfit" }).click();
  await expect(page.getByRole("heading", { name: "Locker" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Monsters" })).toBeVisible();
  await page.getByRole("button", { name: /Brew in the Cauldron/ }).click();
  await expect(page.getByRole("heading", { name: "The Cauldron" })).toBeVisible();
  await page.getByRole("button", { name: "Back to locker" }).click();
  await page.getByRole("button", { name: "Back to profile" }).click();
  await expect(card).toBeVisible();
});

test("someone else's profile card shows what they're wearing, with no tokens or Locker", async ({ page }) => {
  await fakeLoot(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Rankings" }).click();
  await page.getByRole("button", { name: /Unranked players/ }).click();
  await page.getByRole("button", { name: /Bob/ }).first().click();
  const card = page.getByRole("region", { name: "Bob's avatar" });
  await expect(card.getByText(CATALOG.get(HAT).name)).toBeVisible({ timeout: 20_000 });
  await expect(card.getByText(CATALOG.get(TEE).name)).toBeVisible();
  await expect(card.getByRole("button", { name: "Change outfit" })).toHaveCount(0);
});

test("the Locker wears what you tap, and a monster switches off with Back to my outfit", async ({ page }) => {
  await signInAsPlayer(page);
  const calls = await fakeLoot(page);
  await openMyProfile(page);
  await expect(page.getByText("3 tokens to brew")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Change outfit" }).click();

  // Opens on the tab with something NEW: the hat, worn already.
  await expect(page.getByRole("tab", { name: /Head/ })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("button", { name: /Ghostfire/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("NEW")).toBeVisible();
  await page.getByRole("button", { name: /^Plain/ }).click();
  await expect(page.getByRole("button", { name: /^Plain/ })).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("tab", { name: "Pants" }).click();
  await page.getByRole("button", { name: /Mismatched/ }).click();

  await page.getByRole("tab", { name: "Monsters" }).click();
  await page.getByRole("button", { name: new RegExp(CATALOG.get(MONSTER).name) }).click();
  await expect(page.getByText(`Transformed: ${CATALOG.get(MONSTER).name}`)).toBeVisible();
  await page.getByRole("button", { name: "Back to my outfit" }).click();
  await expect(page.getByText(/Transformed:/)).toHaveCount(0);

  await expect.poll(() => calls.map((c) => `${c.fn} ${JSON.stringify(c.args)}`)).toEqual([
    'unequip {"p_slot":"head"}',
    `equip_item {"p_key":"${SOCKS}"}`,
    `equip_item {"p_key":"${MONSTER}"}`,
    'unequip {"p_slot":"transformation"}',
  ]);
  // Leaving clears the NEW badges.
  await page.getByRole("button", { name: "Back to profile" }).click();
  await expect.poll(() => calls.some((c) => c.fn === "mark_items_seen")).toBe(true);
});

test("the Locker picks Avatar 1 or 2 and a skin color, keeping the outfit", async ({ page }) => {
  await signInAsPlayer(page);
  const calls = await fakeLoot(page);
  await openMyProfile(page);
  await page.getByRole("button", { name: "Change outfit" }).click();
  await expect(page.getByRole("radio", { name: "Avatar 1" })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("radio", { name: "Skin color 2" })).toHaveAttribute("aria-checked", "true");
  await page.getByRole("radio", { name: "Avatar 2" }).click();
  await page.getByRole("radio", { name: "Skin color 4" }).click();
  await expect(page.getByRole("radio", { name: "Avatar 2" })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("radio", { name: "Skin color 4" })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("button", { name: /Ghostfire/ })).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => calls.filter((c) => c.fn === "set_look").map((c) => c.args)).toEqual([
    { p_avatar: 2, p_skin: 2 },
    { p_avatar: 2, p_skin: 4 },
  ]);
});

test("brewing plays the Cauldron, reveals the prize and Wear it puts it on", async ({ page }) => {
  await signInAsPlayer(page);
  const calls = await fakeLoot(page);
  await openMyProfile(page);
  await page.getByRole("button", { name: "Change outfit" }).click();
  await page.getByRole("button", { name: /Brew in the Cauldron/ }).click();
  await page.getByRole("button", { name: "Brew · 1 token" }).click();
  await expect(page.getByText("Chomper")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("Epic", { exact: true })).toBeVisible();
  await expect(page.getByText("2 tokens", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Wear it" }).click();
  await expect(page.getByRole("button", { name: "✓ Wearing it" })).toBeVisible();
  expect(calls.filter((c) => c.fn !== "mark_items_seen").map((c) => c.fn)).toEqual(["brew", "equip_item"]);
  expect(calls.find((c) => c.fn === "equip_item").args).toEqual({ p_key: PRIZE });
});

test("with no tokens the Cauldron says how to earn them", async ({ page }) => {
  await signInAsPlayer(page);
  await fakeLoot(page, { tokens: 0 });
  await openMyProfile(page);
  await expect(page.getByText("No tokens yet")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Change outfit" }).click();
  await page.getByRole("button", { name: /Brew in the Cauldron/ }).click();
  await expect(page.getByRole("button", { name: "Brew · 1 token" })).toBeDisabled();
  await expect(page.getByText(/Ranked games earn them/)).toBeVisible();
});
