const SECTIONS = [
  { tier: "legendary", prefix: "XL", title: "Legendary", cls: "t3", blurb: "The showpieces: glow, particles and motion." },
  { tier: "epic", prefix: "XE", title: "Epic", cls: "t2", blurb: "Strong silhouettes with one small animation each." },
];
const xtiles = [];
// Three-digit numbers for the owner to cut by, from 301 in page order (page
// 13's wardrobe uses 101 upward).
let xnum = 301;
const xvisible = new Set();
const xio = new IntersectionObserver((es) => { for (const e of es) e.isIntersecting ? xvisible.add(e.target) : xvisible.delete(e.target); }, { rootMargin: "200px" });
const xmain = document.getElementById("xslots");
const xnav = document.getElementById("xnav");
for (const sec of SECTIONS) {
  const list = SKINS2[sec.tier];
  const el = document.createElement("section");
  el.id = sec.tier;
  el.className = "slot";
  el.innerHTML = `<div class="sec-head"><span class="eyebrow ${sec.cls}">${list.length} transformations · ${xnum}–${xnum + list.length - 1}</span><h2 class="${sec.cls}">${sec.title}</h2><p>${sec.blurb}</p></div><div class="grid xgrid"></div>`;
  xnav.insertAdjacentHTML("beforeend", `<a class="chip ${sec.cls}" href="#${sec.tier}">${sec.title} <span class="n">${list.length}</span></a>`);
  const grid = el.querySelector(".xgrid");
  list.forEach((s, i) => {
    const code = String(xnum++);
    const card = document.createElement("article");
    card.className = "card xcard";
    card.id = `n${code}`;
    card.innerHTML = `
      <div class="card-top"><h3>${s.name}</h3><span class="code ${sec.cls}">${code}</span></div>
      <canvas class="xbig" width="30" height="38" aria-label="${s.name}"></canvas>
      <div class="av-small"><canvas width="96" height="36" style="width:96px;height:36px" aria-label="${s.name} at real home-screen size"></canvas><span>Real size in the rally</span></div>
      <p class="pitch">${s.pitch}</p>`;
    grid.appendChild(card);
    const [big, small] = card.querySelectorAll("canvas");
    xtiles.push({ s, card, big: big.getContext("2d"), small: small.getContext("2d") });
    xio.observe(card);
  });
  xmain.appendChild(el);
}
document.getElementById("xtotal").textContent = SKINS2.epic.length + SKINS2.legendary.length;

const xstart = performance.now();
(function loop(now) {
  const t = Math.max(0, (now - xstart) / 1000);
  for (const e of xtiles) {
    if (!xvisible.has(e.card) || !e.s) continue;
    try {
      R(e.big, 0, 0, 30, 38, "#140a26");
      glow(e.big, 15, 20, 19, "#4b3f70", 0.4);
      R(e.big, 0, 35, 30, 3, "#1c1030"); R(e.big, 0, 35, 30, 1, "#3a2a5c");
      drawSkin2(e.big, e.s, 15, 35, t);
      R(e.small, 0, 0, 96, 36, "#140a26");
      R(e.small, 0, 33, 96, 3, "#1c1030"); R(e.small, 0, 33, 96, 1, "#3a2a5c");
      R(e.small, 47, 18, 1, 15, "#6b5f8d"); R(e.small, 44, 18, 7, 1, "#a99bc9");
      drawSkin2(e.small, e.s, 22, 33, t);
      e.small.save(); e.small.translate(96, 0); e.small.scale(-1, 1);
      drawAvatar(e.small, {}, 20, 33, t + 1.3);
      e.small.restore();
      const ph = reduced ? 0.3 : (t * 0.8) % 2, f = ph < 1 ? ph : 2 - ph;
      R(e.small, 32 + 34 * f, 2 + (1 - Math.sin(f * Math.PI)) * 9, 2, 2, "#ffcf3a");
    } catch (err) { console.error(e.s.name, err); e.s = null; }
  }
  requestAnimationFrame(loop);
})(xstart);
