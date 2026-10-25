import { expect, test } from "@playwright/test";
import { ADMIN_NAME, getAdminSession, PLAYER_NAME, signInAsPlayer } from "./signInAsTestUser.js";

// Whoever logs a game can be any of its players, or not playing at all --
// checked against the saved game, not just the screen: each person exactly
// where they were picked, nobody twice, and the logger nowhere unless they
// played.
//
// 2v2 beach is the risky one: Player 1 (A1) has no game_players row -- it's
// games.user_id, which record_game sets to the real A1 as it saves the
// game. Real bug (2026-10-23): a member who put
// themselves in slot 3 ended up as both player 1 and player 3, because that
// function only accepted a new A1 who was already linked to the game, and
// A1 never is. 3v3/4v4 beach and indoor store every player as a team row,
// so they're covered here too to keep it that way.
//
// Bigger rosters borrow a few of the "no games" demo players
// (seedStagingGames.js), so every game made here is deleted again at the
// end, leaving them (and the demo Elo) exactly as they were.

async function pickPlayer(page, label, name) {
  await page.getByLabel(label).fill(name);
  await page.getByRole("option", { name }).first().click();
}

async function rest(session, path, { method = "GET", body } = {}) {
  const res = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: process.env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// Where the database says each person is in this bot's latest game with
// that exact score: 2v2 beach as { a1, a2, b1, b2 }, rosters as sorted
// { a: [...], b: [...] }.
async function savedGame(session, scoreA, scoreB) {
  const rows = await rest(
    session,
    `games?submitted_by_name=eq.${PLAYER_NAME}&score_a=eq.${scoreA}&score_b=eq.${scoreB}` +
      "&order=created_at.desc&limit=1" +
      "&select=id,format,team_size,a1:profiles!games_user_id_fkey(display_name),game_players(slot,team,profiles(display_name))",
  );
  const game = rows[0];
  if (!game) return null;
  if (game.format === "beach" && game.team_size == null) {
    const players = { a1: game.a1?.display_name };
    for (const gp of game.game_players) players[gp.slot] = gp.profiles?.display_name;
    return { id: game.id, players };
  }
  const team = (t) => game.game_players.filter((gp) => gp.team === t).map((gp) => gp.profiles?.display_name).sort();
  return { id: game.id, players: { a: team("a"), b: team("b") } };
}

const SIZE_BUTTON = { 2: "2v2 Beach", 3: "3v3 Beach", 4: "4v4 Beach" };

async function logFinalScore(page, { format, size, mode, teamA, teamB, scoreA, scoreB }) {
  await page.goto("/");
  await page.getByRole("button", { name: "Game tracking" }).click();
  await page.getByRole("button", { name: "New Game" }).click();
  await page.getByRole("button", { name: "Enter Final Score" }).click();
  if (format === "indoor") {
    await page.getByRole("button", { name: "6v6 Indoor" }).click();
  } else {
    await page.getByRole("button", { name: "Beach" }).click();
    await page.getByRole("button", { name: SIZE_BUTTON[size] }).click();
  }
  await page.getByRole("button", { name: mode }).click();

  let nameA, nameB;
  if (format === "beach" && size === 2) {
    await pickPlayer(page, "First side, player 1 name", teamA[0]);
    await pickPlayer(page, "First side, player 2 name", teamA[1]);
    await pickPlayer(page, "Second side, player 1 name", teamB[0]);
    await pickPlayer(page, "Second side, player 2 name", teamB[1]);
    nameA = teamA.join(" & ");
    nameB = teamB.join(" & ");
  } else {
    for (const name of teamA) await pickPlayer(page, "First side, search players", name);
    for (const name of teamB) await pickPlayer(page, "Second side, search players", name);
    nameA = teamA.join(", ");
    nameB = teamB.join(", ");
  }

  await page.getByRole("button", { name: "Add Score" }).click();
  await page.getByLabel(`${nameA} final score`).fill(String(scoreA));
  await page.getByLabel(`${nameB} final score`).fill(String(scoreB));
  await page.getByRole("button", { name: "Save Game" }).click();
  await expect(page.getByRole("heading", { name: "Past Games" })).toBeVisible();
  return { nameA, nameB };
}

function expectedPlayers(c) {
  if (c.format === "beach" && c.size === 2) {
    return { a1: c.teamA[0], a2: c.teamA[1], b1: c.teamB[0], b2: c.teamB[1] };
  }
  return { a: [...c.teamA].sort(), b: [...c.teamB].sort() };
}

// Logs the game, waits for the save to finish, checks the database and the
// game details screen, and hands back the game's id.
async function logAndCheck(page, session, c) {
  const before = await savedGame(session, c.scoreA, c.scoreB);
  const { nameA, nameB } = await logFinalScore(page, c);

  let gameId;
  await expect
    .poll(
      async () => {
        const saved = await savedGame(session, c.scoreA, c.scoreB);
        if (!saved || saved.id === before?.id) return null;
        gameId = saved.id;
        return saved.players;
      },
      { timeout: 15_000 },
    )
    .toEqual(expectedPlayers(c));
  await expect(page.getByRole("alert")).toHaveCount(0);

  const everyone = [...c.teamA, ...c.teamB];
  const row = page.getByRole("listitem").filter({ hasText: `${c.scoreA} – ${c.scoreB}` });
  await row.getByRole("button", { name: `Game details: ${nameA} vs ${nameB}, ` }).first().click();
  for (const name of everyone) {
    await expect(page.getByRole("button", { name: `View ${name}'s profile` })).toHaveCount(1);
  }
  if (!everyone.includes(PLAYER_NAME)) {
    await expect(page.getByRole("button", { name: `View ${PLAYER_NAME}'s profile` })).toHaveCount(0);
  }
  return gameId;
}

async function deleteGame(gameId) {
  if (!gameId) return;
  const admin = await getAdminSession();
  await rest(admin, "rpc/admin_delete_game", { method: "POST", body: { p_game_id: gameId } });
}

// Unusual scores so each case finds its own game among anything earlier
// runs left on staging.
const CASES = [
  { title: "2v2 beach, logger is player 2", format: "beach", size: 2, teamA: ["Bob", PLAYER_NAME], teamB: ["Carla", "Dana"], scoreA: 31, scoreB: 29 },
  { title: "2v2 beach, logger is player 3", format: "beach", size: 2, teamA: ["Bob", "Carla"], teamB: [PLAYER_NAME, "Dana"], scoreA: 32, scoreB: 30 },
  { title: "2v2 beach, logger is player 4", format: "beach", size: 2, teamA: ["Bob", "Carla"], teamB: ["Dana", PLAYER_NAME], scoreA: 33, scoreB: 31 },
  { title: "2v2 beach, logger isn't playing", format: "beach", size: 2, teamA: ["Alice", "Bob"], teamB: ["Carla", "Dana"], scoreA: 34, scoreB: 32 },
  { title: "3v3 beach, logger on the second side", format: "beach", size: 3, teamA: ["Alice", "Bob", "Carla"], teamB: ["Dana", PLAYER_NAME, ADMIN_NAME], scoreA: 36, scoreB: 34 },
  { title: "3v3 beach, logger isn't playing", format: "beach", size: 3, teamA: ["Alice", "Bob", "Carla"], teamB: ["Dana", ADMIN_NAME, "Felix Stone"], scoreA: 37, scoreB: 35 },
  { title: "4v4 beach, logger on the second side", format: "beach", size: 4, teamA: ["Alice", "Bob", "Carla", "Dana"], teamB: ["Felix Stone", PLAYER_NAME, ADMIN_NAME, "Grace Holt"], scoreA: 38, scoreB: 36 },
  { title: "4v4 beach, logger isn't playing", format: "beach", size: 4, teamA: ["Alice", "Bob", "Carla", "Dana"], teamB: [ADMIN_NAME, "Felix Stone", "Grace Holt", "Ivy Marsh"], scoreA: 39, scoreB: 37 },
  { title: "indoor, logger on the second side", format: "indoor", teamA: ["Alice", "Bob", "Carla", "Dana"], teamB: ["Felix Stone", "Grace Holt", PLAYER_NAME, "Ivy Marsh"], scoreA: 40, scoreB: 38 },
  { title: "indoor, logger isn't playing", format: "indoor", teamA: ["Alice", "Bob", "Carla", "Dana"], teamB: ["Felix Stone", "Grace Holt", "Ivy Marsh", "Jack Rowe"], scoreA: 41, scoreB: 39 },
];

for (const c of CASES) {
  test(`casual ${c.title}`, async ({ page }) => {
    // Picking up to 8 players one search at a time is slow on free-tier
    // staging.
    test.setTimeout(90_000);
    const session = await signInAsPlayer(page);
    let gameId;
    try {
      gameId = await logAndCheck(page, session, { mode: "Casual", ...c });
    } finally {
      await deleteGame(gameId ?? (await savedGame(session, c.scoreA, c.scoreB))?.id);
    }
  });
}

// Ranked: the rating change has to land on the real players, once each.
// Only the e2e fixtures play these, never demo players.
const RANKED_CASES = [
  { title: "2v2 beach, logger is player 3", format: "beach", size: 2, teamA: ["Bob", "Carla"], teamB: [PLAYER_NAME, "Dana"], scoreA: 35, scoreB: 33 },
  { title: "3v3 beach, logger on the second side", format: "beach", size: 3, teamA: ["Alice", "Bob", "Carla"], teamB: ["Dana", PLAYER_NAME, ADMIN_NAME], scoreA: 42, scoreB: 40 },
];

for (const c of RANKED_CASES) {
  test(`ranked ${c.title} rates each player once`, async ({ page }) => {
    test.setTimeout(90_000);
    const session = await signInAsPlayer(page);
    let gameId;
    try {
      gameId = await logAndCheck(page, session, { mode: "Ranked", ...c });
      await expect
        .poll(async () => {
          const history = await rest(session, `elo_history?game_id=eq.${gameId}&select=delta,profiles(display_name)`);
          return history.map((h) => `${h.profiles?.display_name} ${h.delta > 0 ? "up" : "down"}`).sort();
        })
        .toEqual([...c.teamA.map((n) => `${n} up`), ...c.teamB.map((n) => `${n} down`)].sort());
    } finally {
      await deleteGame(gameId ?? (await savedGame(session, c.scoreA, c.scoreB))?.id);
    }
  });
}
