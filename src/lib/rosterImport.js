import { fuzzyFilter } from "./fuzzyMatch.js";

// Parses a registration list pasted from the Google Form's response sheet.
// Copying cells from Google Sheets pastes tab-separated text; a downloaded
// .csv is comma-separated with "quoted" fields — both are handled. Columns
// are found by header name, so column order and extra columns (timestamp,
// date of birth, payment...) don't matter. Date of birth is deliberately
// never read (owner's call: the app doesn't store it).

function splitRows(text) {
  const delimiter = text.split("\n")[0].includes("\t") ? "\t" : ",";
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
    } else if (ch === '"' && field === "") {
      quoted = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  row.push(field);
  rows.push(row);
  return rows.map((r) => r.map((f) => f.trim())).filter((r) => r.some(Boolean));
}

const COLUMN_PATTERNS = {
  firstName: /first/i,
  lastName: /last/i,
  fullName: /^(full )?name$/i,
  email: /e-?mail/i,
  phone: /phone|cell|mobile/i,
  division: /division/i,
};

export function parseRoster(text) {
  const rows = splitRows(text || "");
  if (rows.length < 2) return { players: [], error: "Paste the header row and at least one player." };
  const header = rows[0];
  const col = {};
  for (const [key, pattern] of Object.entries(COLUMN_PATTERNS)) {
    const idx = header.findIndex((h) => pattern.test(h));
    if (idx !== -1) col[key] = idx;
  }
  if (col.firstName === undefined && col.fullName === undefined) {
    return { players: [], error: 'Couldn\'t find a "First name" or "Name" column in the first row.' };
  }

  const seen = new Set();
  const players = [];
  for (const r of rows.slice(1)) {
    const get = (key) => (col[key] === undefined ? "" : r[col[key]] || "");
    const name = (col.firstName !== undefined ? `${get("firstName")} ${get("lastName")}` : get("fullName"))
      .replace(/\s+/g, " ")
      .trim();
    if (!name) continue;
    const email = get("email").toLowerCase();
    // The same person submitting the form twice: keep the last submission.
    const key = email || name.toLowerCase();
    if (seen.has(key)) {
      const i = players.findIndex((p) => (p.email || p.name.toLowerCase()) === key);
      players.splice(i, 1);
    }
    seen.add(key);
    players.push({ name, email, phone: get("phone"), division: get("division") });
  }
  return { players, error: players.length ? "" : "No players found under the header row." };
}

function normalize(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// For each imported player: an exact (case/accent-insensitive) name match
// to an existing profile is pre-selected; otherwise the closest few profiles
// are offered as suggestions and the default is "create a new manual
// profile". The admin confirms every row before anything is saved.
export function matchToProfiles(players, profiles) {
  return players.map((p) => {
    const target = normalize(p.name);
    const exact = profiles.filter((pr) => normalize(pr.display_name || "") === target);
    const suggestions = exact.length
      ? exact
      : fuzzyFilter(p.name, profiles, (pr) => pr.display_name || "", 3).concat(
          fuzzyFilter(p.name.split(" ")[0], profiles, (pr) => pr.display_name || "", 3),
        );
    const unique = [...new Map(suggestions.map((s) => [s.id, s])).values()].slice(0, 4);
    // Several profiles with the same name: if exactly one is a real (Google)
    // account, that's almost certainly the person; otherwise make the admin
    // choose rather than guess.
    const real = exact.filter((pr) => !pr.is_manual);
    const profileId = exact.length === 1 ? exact[0].id : real.length === 1 ? real[0].id : null;
    return { ...p, suggestions: unique, profileId };
  });
}

// Maps the form's division text (e.g. "Women's Open - $40") to one of the
// tournament's divisions by name.
export function matchDivision(text, divisions) {
  const t = normalize(text || "");
  if (!t) return null;
  const exact = divisions.find((d) => normalize(d.name) === t);
  if (exact) return exact.id;
  // Longest division name contained in the text wins, so "Women's AA" isn't
  // mistaken for "Women's A".
  const contained = divisions
    .filter((d) => t.includes(normalize(d.name)))
    .sort((a, b) => b.name.length - a.name.length);
  return contained[0]?.id ?? null;
}
