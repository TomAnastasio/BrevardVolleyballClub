// ---------- Locker mockup: three layouts sharing one fake inventory ----------
const LSLOTS = [
  { key: "head", label: "Head", close: { w: 24, h: 30, bottom: 43, x: 12 } },
  { key: "shirt", label: "Shirt", close: { w: 20, h: 18, bottom: 22, x: 10 } },
  { key: "pants", label: "Pants", close: { w: 20, h: 16, bottom: 15, x: 10 } },
  { key: "shoes", label: "Shoes", close: { w: 16, h: 10, bottom: 9, x: 8, light: true } },
];
const TIERS = ["common", "rare", "epic", "legendary"];
const TIER_LABEL = ["Common", "Rare", "Epic", "Legendary"];

// what this fake player owns: [theme index, tier, common color index]
const PICKS = [[0, 0, 0], [1, 0, 2], [2, 1], [3, 0, 4], [4, 2], [5, 0, 1], [6, 1], [7, 3], [8, 0, 5]];
const INV = {};
for (const s of LSLOTS) {
  const themes = THEMES[s.key];
  const items = [];
  PICKS.forEach(([ti, tier, ci], k) => {
    const th = themes[ti];
    if (!th) return;
    const d = th[TIERS[tier]];
    try {
      const item = tier === 0 ? d.make(d.colors[ci]) : d.item;
      const name = tier === 0 ? `${th.name} (${d.colors[ci].name.toLowerCase()})` : d.name;
      items.push({ id: `${s.key}${k}`, name, tier, item, isNew: s.key === "head" && k === 7, fresh: (s.key === "head" && k === 7) || (s.key === "shirt" && k === 3) });
    } catch (err) { console.error(s.key, th.name, err); }
  });
  items.sort((a, b) => b.tier - a.tier);
  INV[s.key] = { items, total: themes.length * 9 };
}
const MON = [
  { skin: SKINS2.legendary[1], tier: 3, isNew: true, fresh: true },
  { skin: SKINS2.epic[2], tier: 2 },
  { skin: SKINS2.epic[6], tier: 2 },
  { skin: SKINS2.epic[9], tier: 2 },
].filter((m) => m.skin).map((m, i) => ({ ...m, id: `mon${i}`, name: m.skin.name }));
const MON_TOTAL = SKINS2.legendary.length + SKINS2.epic.length;
const TOKENS = 7;

// ---------- painting ----------
const painters = []; // { ctx, fn(ctx, t) }
function paintClose(ctx, slot, item, t) {
  const cl = slot.close;
  R(ctx, 0, 0, cl.w, cl.h, cl.light ? "#3a2d5c" : "#140a26");
  glow(ctx, cl.w / 2, cl.h / 2, cl.w * 0.6, cl.light ? "#6b5f8d" : "#4b3f70", 0.45);
  if (cl.light) R(ctx, 0, cl.h - 1, cl.w, 1, "#6b5f8d");
  drawAvatar(ctx, item ? { [slot.key]: item } : {}, cl.x, cl.bottom, t);
}
function paintMonster(ctx, skin, t) {
  R(ctx, 0, 0, 30, 38, "#140a26");
  glow(ctx, 15, 20, 19, "#4b3f70", 0.4);
  R(ctx, 0, 35, 30, 3, "#1c1030"); R(ctx, 0, 35, 30, 1, "#3a2a5c");
  if (skin) drawSkin2(ctx, skin, 15, 35, t);
  else drawAvatar(ctx, {}, 15, 35, t);
}
function paintStage(ctx, w, h, ground, st, t) {
  R(ctx, 0, 0, w, h, "#140a26");
  glow(ctx, w / 2, ground - 16, Math.max(w, h) * 0.5, st.monster ? "#6b3fa8" : "#7a4ad9", 0.32);
  R(ctx, 0, ground, w, h - ground, "#1c1030"); R(ctx, 0, ground, w, 1, "#3a2a5c");
  fade(ctx, 0.5, () => { ctx.fillStyle = "#4b3f70"; ctx.beginPath(); ctx.ellipse(w / 2, ground + 0.5, 10, 1.6, 0, 0, TAU); ctx.fill(); });
  if (st.monster) drawSkin2(ctx, st.monster.skin, w / 2, ground, t);
  else drawAvatar(ctx, gearOf(st), w / 2, ground, t);
}
const gearOf = (st) => Object.fromEntries(LSLOTS.map((s) => [s.key, st.gear[s.key] ? st.gear[s.key].item : null]));

// ---------- shared pieces ----------
const el = (html) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const esc = (s) => s.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);

function newState() {
  const pick = (k, i) => INV[k].items[i] || null;
  return { gear: { head: pick("head", 1), shirt: pick("shirt", 2), pants: pick("pants", 4), shoes: pick("shoes", 3) }, monster: null, seen: new Set() };
}

// one tile; kind = slot object or "mon"; entry null = Plain
function tileFor(kind, entry, isOn, onPick) {
  const isMon = kind === "mon";
  const tier = entry ? entry.tier : 0;
  const name = entry ? entry.name : isMon ? "No monster" : "Plain";
  const cls = isMon ? "mon" : kind.key;
  const b = el(`<button type="button" class="tile t${tier} ${cls}${isOn ? " on" : ""}" aria-pressed="${isOn}">
      <canvas class="art" width="${isMon ? 30 : kind.close.w}" height="${isMon ? 38 : kind.close.h}"></canvas>
      ${entry && entry.isNew ? `<span class="new">NEW</span>` : ""}
      <span class="nm">${esc(name)}</span>
      <span class="tr">${entry ? TIER_LABEL[tier] : "Starter"}</span>
    </button>`);
  const ctx = b.querySelector("canvas").getContext("2d");
  painters.push({ ctx, node: b, fn: isMon ? (c, t) => paintMonster(c, entry ? entry.skin : null, t) : (c, t) => paintClose(c, kind, entry ? entry.item : null, t) });
  b.addEventListener("click", onPick);
  return b;
}
function lockedTiles(n, label) {
  const frag = document.createDocumentFragment();
  for (let i = 0; i < n; i++) frag.appendChild(el(`<div class="tile locked t0" aria-label="${label} not found yet"><div class="art">?</div><span class="nm">???</span><span class="tr">Not found</span></div>`));
  return frag;
}
function grid(phone, st, kind, cols) {
  const wrap = document.createDocumentFragment();
  const isMon = kind === "mon";
  const inv = isMon ? { items: MON, total: MON_TOTAL } : INV[kind.key];
  wrap.appendChild(el(`<div class="found"><span class="label">${isMon ? "Monsters" : kind.label}</span><span class="muted small">${inv.items.length} of ${inv.total} found</span></div>`));
  const g = el(`<div class="tiles"${cols ? ` style="grid-template-columns:repeat(${cols},minmax(0,1fr))"` : ""}></div>`);
  const cur = isMon ? st.monster : st.gear[kind.key];
  g.appendChild(tileFor(kind, null, !cur, () => phone.pick(kind, null)));
  for (const it of inv.items) g.appendChild(tileFor(kind, it, cur === it, () => phone.pick(kind, it)));
  g.appendChild(lockedTiles(isMon ? 2 : 3, isMon ? "Monster" : kind.label));
  wrap.appendChild(g);
  if (isMon) wrap.appendChild(el(`<p class="muted small">A monster covers your whole outfit. Your clothes stay saved underneath.</p>`));
  return wrap;
}
function banner(st, onBack) {
  const m = st.monster;
  const b = el(`<div class="xbanner${m ? " on" : ""}${m && m.tier === 3 ? " leg" : ""}"><span>Transformed: <b>${m ? esc(m.name) : ""}</b></span><button type="button" class="btn ghost">Back to my outfit</button></div>`);
  b.querySelector("button").addEventListener("click", onBack);
  return b;
}
function chrome(title) {
  const p = el(`<div class="phone">
    <div class="bar"><button type="button" class="back">‹ Profile</button><span class="tok"><i></i>${TOKENS} tokens</span></div>
    <div class="ptitle">${title}</div>
    <div class="scroll"></div>
  </div>`);
  return p;
}
function brewBtn() { return el(`<button type="button" class="btn brew">Brew in the Cauldron · 1 token</button>`); }
function pickInto(st, kind, it) {
  if (kind === "mon") st.monster = it;
  else { st.gear[kind.key] = it; st.monster = null; }
  if (it) it.isNew = false;
}
function stageCanvas(w, h, ground, st) {
  const c = el(`<canvas class="stage" width="${w}" height="${h}" style="aspect-ratio:${w}/${h}" aria-label="Your avatar"></canvas>`);
  painters.push({ ctx: c.getContext("2d"), node: c, stage: true, fn: (ctx, t) => paintStage(ctx, w, h, ground, st, t) });
  return c;
}
const dropPainters = (root) => { for (let i = painters.length - 1; i >= 0; i--) if (!painters[i].stage && root.contains(painters[i].node)) painters.splice(i, 1); };

// ---------- A: mirror and drawers ----------
function optionA() {
  const st = newState();
  const p = chrome("Locker");
  const sc = p.querySelector(".scroll");
  let tab = "head";
  const tabsDef = [...LSLOTS.map((s) => ({ key: s.key, label: s.label, kind: s })), { key: "mon", label: "Monsters", kind: "mon" }];
  sc.appendChild(stageCanvas(56, 38, 34, st));
  const bslot = el(`<div></div>`); sc.appendChild(bslot);
  const tabs = el(`<div class="tabs" role="tablist"></div>`); sc.appendChild(tabs);
  const body = el(`<div style="display:flex;flex-direction:column;gap:8px"></div>`); sc.appendChild(body);
  sc.appendChild(brewBtn());
  const render = () => {
    dropPainters(body);
    bslot.replaceChildren(banner(st, () => p.pick("mon", null)));
    tabs.replaceChildren(...tabsDef.map((d) => {
      const hasNew = (d.key === "mon" ? MON : INV[d.key].items).some((i) => i.isNew);
      const b = el(`<button type="button" role="tab" class="tab" aria-selected="${d.key === tab}">${d.label}${hasNew ? `<span class="dot"></span>` : ""}</button>`);
      b.addEventListener("click", () => { tab = d.key; render(); });
      return b;
    }));
    body.replaceChildren(grid(p, st, tabsDef.find((d) => d.key === tab).kind));
  };
  p.pick = (kind, it) => { pickInto(st, kind, it); render(); };
  p.show = (t) => { tab = t; render(); };
  render();
  return { p, st, name: "A", title: "Mirror and drawers", pitch: "A big mirror on top, one drawer per slot underneath. One slot at a time, with room for big tiles." };
}

// ---------- B: profile card + shelves ----------
function optionB() {
  const st = newState();
  const p = chrome("Locker");
  const sc = p.querySelector(".scroll");
  const card = el(`<div class="card wearing"></div>`);
  card.appendChild(stageCanvas(30, 38, 34, st));
  const list = el(`<ul></ul>`); card.appendChild(list);
  sc.appendChild(card);
  const bslot = el(`<div></div>`); sc.appendChild(bslot);
  const shelves = el(`<div style="display:flex;flex-direction:column;gap:14px"></div>`); sc.appendChild(shelves);
  sc.appendChild(brewBtn());
  const render = () => {
    const scrolls = [...shelves.querySelectorAll(".shelf-row")].map((r) => r.scrollLeft);
    dropPainters(shelves);
    list.replaceChildren(...LSLOTS.map((s) => el(`<li><span class="label">${s.label}</span><b${st.monster ? ` class="muted"` : ""}>${esc(st.gear[s.key] ? st.gear[s.key].name : "Plain")}</b></li>`)),
      el(`<li><span class="label">Monster</span><b>${st.monster ? esc(st.monster.name) : "Off"}</b></li>`));
    bslot.replaceChildren(banner(st, () => p.pick("mon", null)));
    shelves.replaceChildren(...[...LSLOTS, "mon"].map((kind, i) => {
      const isMon = kind === "mon";
      const inv = isMon ? { items: MON, total: MON_TOTAL } : INV[kind.key];
      const cur = isMon ? st.monster : st.gear[kind.key];
      const sh = el(`<div class="shelf"><div class="found"><span class="label">${isMon ? "Monsters" : kind.label}</span><span class="muted small">${inv.items.length} of ${inv.total} found</span></div><div class="shelf-row"></div></div>`);
      const row = sh.querySelector(".shelf-row");
      row.appendChild(tileFor(kind, null, !cur, () => p.pick(kind, null)));
      for (const it of inv.items) row.appendChild(tileFor(kind, it, cur === it, () => p.pick(kind, it)));
      row.appendChild(lockedTiles(2, isMon ? "Monster" : kind.label));
      requestAnimationFrame(() => { row.scrollLeft = scrolls[i] || 0; });
      return sh;
    }));
  };
  p.pick = (kind, it) => { pickInto(st, kind, it); render(); };
  render();
  return { p, st, name: "B", title: "Profile card and shelves", pitch: "The same card as your profile on top, then a sideways-scrolling shelf per slot. Everything on one page." };
}

// ---------- C: paper doll ----------
function optionC() {
  const st = newState();
  const p = chrome("Locker");
  const sc = p.querySelector(".scroll");
  let open = null;
  const doll = el(`<div class="doll"><div class="col l"></div><div class="mid"></div><div class="col r"></div></div>`);
  doll.querySelector(".mid").appendChild(stageCanvas(30, 50, 46, st));
  sc.appendChild(doll);
  const bslot = el(`<div></div>`); sc.appendChild(bslot);
  const monBtnSlot = el(`<div></div>`); sc.appendChild(monBtnSlot);
  const fresh = el(`<div class="shelf"><div class="found"><span class="label">Just brewed</span><span class="muted small">tap to wear</span></div><div class="shelf-row"></div></div>`);
  sc.appendChild(fresh);
  sc.appendChild(brewBtn());
  const sheet = el(`<div class="sheet" role="dialog" aria-label="Choose an item"><div class="grab"></div><div class="sh-head"><h3></h3><button type="button" class="btn ghost">Done</button></div><div class="sh-body"></div></div>`);
  sheet.querySelector(".sh-head button").addEventListener("click", () => { open = null; render(); });
  p.appendChild(sheet);
  const slotBtn = (kind) => {
    const isMon = kind === "mon";
    const cur = isMon ? st.monster : st.gear[kind.key];
    const b = el(`<button type="button" class="slotbtn ${isMon ? "mon" : kind.key}" aria-expanded="${open === kind}">
      <canvas width="${isMon ? 30 : kind.close.w}" height="${isMon ? 38 : kind.close.h}"></canvas>
      <span class="sl">${isMon ? "Monster" : kind.label}</span><span class="nm">${esc(cur ? cur.name : isMon ? "Off" : "Plain")}</span></button>`);
    painters.push({ ctx: b.querySelector("canvas").getContext("2d"), node: b, fn: isMon ? (c, t) => paintMonster(c, cur ? cur.skin : null, t) : (c, t) => paintClose(c, kind, cur ? cur.item : null, t) });
    b.addEventListener("click", () => { open = kind; render(); });
    return b;
  };
  const render = () => {
    dropPainters(doll); dropPainters(sheet); dropPainters(monBtnSlot);
    doll.querySelector(".l").replaceChildren(slotBtn(LSLOTS[0]), slotBtn(LSLOTS[1]));
    doll.querySelector(".r").replaceChildren(slotBtn(LSLOTS[2]), slotBtn(LSLOTS[3]));
    bslot.replaceChildren(banner(st, () => p.pick("mon", null)));
    const mb = slotBtn("mon");
    mb.style.flexDirection = "row"; mb.style.width = "100%"; mb.style.gap = "10px"; mb.style.textAlign = "left";
    mb.querySelector("canvas").style.width = "44px";
    mb.insertAdjacentHTML("beforeend", `<span class="muted small" style="margin-left:auto">${MON.length} of ${MON_TOTAL} ›</span>`);
    monBtnSlot.replaceChildren(mb);
    dropPainters(fresh);
    const freshRow = fresh.querySelector(".shelf-row");
    freshRow.replaceChildren(...[...LSLOTS.flatMap((s) => INV[s.key].items.filter((i) => i.fresh).map((i) => [s, i])), ...MON.filter((m) => m.fresh).map((m) => ["mon", m])]
      .map(([k, it]) => tileFor(k, it, (k === "mon" ? st.monster : st.gear[k.key]) === it, () => p.pick(k, it))));
    sheet.classList.toggle("open", !!open);
    if (open) {
      sheet.querySelector("h3").textContent = open === "mon" ? "Monsters" : open.label;
      sheet.querySelector(".sh-body").replaceChildren(grid(p, st, open, 4));
    }
  };
  p.pick = (kind, it) => { pickInto(st, kind, it); render(); };
  p.show = (k) => { open = k === "mon" ? "mon" : LSLOTS.find((s) => s.key === k) || null; render(); };
  render();
  return { p, st, name: "C", title: "Paper doll", pitch: "Your character stays big in the middle with a button for each part around it. Tap one and a drawer slides up." };
}

// ---------- mount ----------
const optionsEl = document.getElementById("options");
const LOCKERS = [optionA(), optionB(), optionC()];
for (const o of LOCKERS) {
  const col = el(`<div class="option" id="option-${o.name.toLowerCase()}"><div class="opt-head"><span class="code">${o.name}</span><h2>${o.title}</h2><p>${o.pitch}</p></div></div>`);
  col.appendChild(o.p);
  optionsEl.appendChild(col);
}
window.LOCKERS = LOCKERS;
window.LOCKER_MON = MON;

let lastTile = 0;
const lstart = performance.now();
(function loop(now) {
  const t = Math.max(0, (now - lstart) / 1000);
  const tilesToo = now - lastTile > 66; // tiles at ~15fps, stages every frame
  if (tilesToo) lastTile = now;
  for (const pt of painters) {
    if (!pt.stage && !tilesToo) continue;
    try { pt.fn(pt.ctx, t); } catch (err) { console.error(err); pt.fn = () => {}; }
  }
  requestAnimationFrame(loop);
})(lstart);
