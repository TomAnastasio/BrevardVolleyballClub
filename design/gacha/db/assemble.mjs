import fs from "fs";
const [tpl, cat, out] = process.argv.slice(2);
const items = JSON.parse(fs.readFileSync(cat, "utf8"));
const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
const rows = items.map((i) => `  (${q(i.key)}, ${q(i.slot)}, ${q(i.tier)}, ${q(i.name)}, 'halloween-2026', '2026-12-01 00:00:00-05')`).join(",\n");
const s = fs.readFileSync(tpl, "utf8").replace("-- CATALOG --\n;", rows + ";");
fs.writeFileSync(out, s);
console.log("rows", items.length);
