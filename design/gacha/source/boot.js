// ---------- gallery ----------
const SLOTS = [
  { key: "head", prefix: "H", title: "Head", close: { w: 24, h: 30, bottom: 43, x: 12 } },
  { key: "shirt", prefix: "S", title: "Shirts", close: { w: 20, h: 18, bottom: 22, x: 10 } },
  { key: "pants", prefix: "P", title: "Pants", close: { w: 20, h: 16, bottom: 15, x: 10 } },
  { key: "shoes", prefix: "F", title: "Shoes", close: { w: 16, h: 10, bottom: 9, x: 8, light: true } },
];
const TIER = [
  { key: "common", label: "Common", cls: "t0", tag: "C" },
  { key: "rare", label: "Rare", cls: "t1", tag: "R" },
  { key: "epic", label: "Epic", cls: "t2", tag: "E" },
  { key: "legendary", label: "Legendary", cls: "t3", tag: "L" },
];
const tiles = [];
const visible = new Set();
const io = new IntersectionObserver((entries) => {
  for (const e of entries) e.isIntersecting ? visible.add(e.target) : visible.delete(e.target);
}, { rootMargin: "200px" });

function paintClose(ctx, slot, item, t, still) {
  const cl = slot.close;
  R(ctx, 0, 0, cl.w, cl.h, cl.light ? "#3a2d5c" : "#140a26");
  glow(ctx, cl.w / 2, cl.h / 2, cl.w * 0.6, cl.light ? "#6b5f8d" : "#4b3f70", 0.45);
  if (cl.light) R(ctx, 0, cl.h - 1, cl.w, 1, "#6b5f8d");
  drawAvatar(ctx, { [slot.key]: item }, cl.x, cl.bottom, t, still);
}
function paintProf(ctx, slot, item, t) {
  R(ctx, 0, 0, 24, 40, "#140a26");
  glow(ctx, 12, 22, 15, "#4b3f70", 0.4);
  R(ctx, 0, 37, 24, 3, "#1c1030"); R(ctx, 0, 37, 24, 1, "#3a2a5c");
  drawAvatar(ctx, { [slot.key]: item }, 12, 37, t);
}

const main = document.getElementById("slots");
const nav = document.getElementById("slot-nav");
let total = 0;
// Every card gets a three-digit number for the owner to cut by, counting up
// from 101 in page order (page 14's monsters start at 301, so they never clash).
let num = 101;
// Cards the owner cut (2026-10-24). They're hidden but keep their numbers, so
// every other card's number stays the same.
const CUT = new Set([161, 162, 163, 164, 177, 178, 179, 180, 209, 210, 211, 212, 249, 250, 251, 252]);
for (const slot of SLOTS) {
  const themes = THEMES[slot.key];
  const sec = document.createElement("section");
  sec.id = slot.key;
  sec.className = "slot";
  sec.innerHTML = `<div class="sec-head"><span class="eyebrow"></span><h2>${slot.title}</h2></div>`;
  themes.forEach((th, ti) => {
    const code = `${slot.prefix}${ti + 1}`;
    const art = document.createElement("article");
    art.className = "theme";
    art.id = code.toLowerCase();
    art.innerHTML = `<div class="theme-head"><span class="code">${code}</span><h3>${th.name}</h3><p>${th.pitch}</p></div><div class="tiers4"></div>`;
    const row = art.querySelector(".tiers4");
    const first = num;
    for (const tier of TIER) {
      const d = th[tier.key];
      if (!d) continue;
      const n = num++;
      if (CUT.has(n)) continue;
      total += tier.key === "common" ? d.colors.length : 1;
      const tile = document.createElement("div");
      tile.className = "tile";
      const name = tier.key === "common" ? `${d.colors.length} colors` : d.name;
      tile.innerHTML = `
        <div class="tile-top"><span class="tier ${tier.cls}">${tier.label}</span><span class="tcode ${tier.cls}">${n}</span></div>
        <div class="views">
          <canvas class="close" width="${slot.close.w}" height="${slot.close.h}" style="aspect-ratio:${slot.close.w}/${slot.close.h}" aria-label="${th.name} ${tier.label} close-up"></canvas>
          <canvas class="prof" width="24" height="40" aria-label="${th.name} ${tier.label} on the avatar"></canvas>
        </div>
        <p class="tname ${tier.cls}">${name}</p>
        ${tier.key === "common" ? `<div class="swatches" role="group" aria-label="${th.name} colors">${d.colors.map((col, i) => `<button class="sw" data-i="${i}" aria-pressed="${i === 0}" title="${col.name}" aria-label="${col.name}"><canvas width="${slot.close.w}" height="${slot.close.h}"></canvas></button>`).join("")}</div>` : ""}
        <p class="tpitch">${tier.key === "common" ? (d.pitch || "") + ` <span class="swname">${d.colors[0].name}</span>` : d.pitch}</p>`;
      row.appendChild(tile);
      const [close, prof] = tile.querySelectorAll(".views canvas");
      const entry = { tile, slot, item: null, close: close.getContext("2d"), prof: prof.getContext("2d") };
      try {
        entry.item = tier.key === "common" ? d.make(d.colors[0]) : d.item;
        if (tier.key === "common") {
          tile.querySelectorAll(".sw").forEach((b) => {
            const i = Number(b.dataset.i);
            const item = d.make(d.colors[i]);
            paintClose(b.querySelector("canvas").getContext("2d"), slot, item, 0, true);
            b.addEventListener("click", () => {
              entry.item = item;
              tile.querySelectorAll(".sw").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
              tile.querySelector(".swname").textContent = d.colors[i].name;
            });
          });
        }
      } catch (err) {
        console.error(code, tier.key, err);
      }
      tiles.push(entry);
      io.observe(tile);
    }
    art.querySelector(".code").textContent = `${first}–${num - 1}`;
    if (row.children.length) sec.appendChild(art);
  });
  // counts leave out themes that were cut entirely
  const shown = sec.querySelectorAll("article.theme").length;
  sec.querySelector(".eyebrow").textContent = `${shown} themes`;
  nav.insertAdjacentHTML("beforeend", `<a class="chip" href="#${slot.key}">${slot.title} <span class="n">${shown}</span></a>`);
  main.appendChild(sec);
}
document.getElementById("total").textContent = total;

const start = performance.now();
(function loop(now) {
  const t = Math.max(0, (now - start) / 1000);
  for (const e of tiles) {
    if (!visible.has(e.tile) || !e.item) continue;
    try { paintClose(e.close, e.slot, e.item, t); paintProf(e.prof, e.slot, e.item, t); }
    catch (err) { e.item = null; console.error(err); }
  }
  requestAnimationFrame(loop);
})(start);
