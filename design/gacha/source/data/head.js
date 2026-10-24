// ===================== HEAD: 10 themes =====================
(() => {
  // ---------- shared bits ----------
  const tw = (t, k = 0) => Math.sin(t * 6 + k * 2.1) > 0.3;
  const blinkAt = (t, period = 3.6) => !reduced && t % period > period - 0.18;
  const pal3 = (base) => ({ base, hi: lighten(base, 0.3), sh: darken(base, 0.7) });

  // ---------- 1. Devil Horns ----------
  // each horn: out, up, then the tip curls back in
  const HORN = [[4, 1, 2], [4, 0, 2], [3, -1, 2], [3, -2, 1], [3, -3, 1], [4, -4, 1]];
  function horns(hi, sh, opts = {}) {
    const g = makeGrid();
    HORN.forEach(([x, y, w], k) => {
      for (let i = 0; i < w; i++) {
        const col = opts.px ? opts.px(k, i) : i === 0 ? hi : sh;
        g.set(x + i, y, col);
        g.set(14 - x - i, y, opts.px ? opts.px(k, i) : i === 0 ? sh : hi);
      }
    });
    outline(g);
    return g;
  }
  addTheme("head", {
    name: "Devil Horns",
    pitch: "Two curled horns poking out of the hair. Small and cheeky, and the face stays fully visible.",
    common: {
      pitch: "Classic curled horns.",
      colors: [
        { name: "Devil red", hi: "#e0384e", sh: "#8f1426" },
        { name: "Coal black", hi: "#4a4060", sh: "#1a1424" },
        { name: "Bone", hi: "#ece6d6", sh: "#b9ae94" },
        { name: "Witch purple", hi: "#9a5cf0", sh: "#52308a" },
        { name: "Pumpkin", hi: "#ff9a3a", sh: "#a8470a" },
        { name: "Slime green", hi: "#7dff5a", sh: "#2f8a3a" },
      ],
      make: (c) => ({ build: () => horns(c.hi, c.sh) }),
    },
    rare: {
      name: "Ram Horns",
      pitch: "Thick, ridged ram horns that curl all the way around the sides of the head.",
      item: {
        build() {
          const g = makeGrid();
          const L = [[5, 1], [4, 0], [3, 0], [2, 1], [2, 2], [2, 3], [3, 4], [4, 4], [4, 3], [3, -1], [4, -1], [5, 0]];
          L.forEach(([x, y], i) => {
            const col = i % 3 === 0 ? "#b9ae94" : "#e8dcc0";
            g.set(x, y, col); g.set(14 - x, y, i % 3 === 0 ? "#9a8f78" : "#d9cfb2");
          });
          outline(g);
          return g;
        },
      },
    },
    epic: {
      name: "Smoking Horns",
      pitch: "Red horns with thin smoke curling up off the tips, like something just got very hot.",
      item: {
        build: () => horns("#e0384e", "#8f1426"),
        over(c, l, tp, t) {
          for (const sx of [4, 10]) for (let k = 0; k < 3; k++) {
            const ph = (t * 0.6 + k / 3 + (sx > 7 ? 0.5 : 0)) % 1;
            fade(c, 0.7 * (1 - ph), () => R(c, l + sx + Math.round(Math.sin(t * 2 + k + sx) * 2 * ph), tp - 6 - ph * 9, ph > 0.5 ? 2 : 1, ph > 0.5 ? 2 : 1, "#a99bc9"));
          }
        },
      },
    },
    legendary: {
      name: "Lava Horns",
      pitch: "Horns of living lava: they glow and churn from yellow to deep red, drip molten rock, and throw off embers.",
      item: {
        under: (c, l, tp, t) => glow(c, l + 7, tp - 2, 14, "#ff7a1a", 0.4 + 0.12 * Math.sin(t * 9)),
        build(t) {
          const LAVA = ["#fff3a0", "#ffd84a", "#ff7a1a", "#c4300a"];
          return horns(null, null, { px: (k, i) => LAVA[Math.abs(Math.floor(t * 6 + k * 1.3 + i * 2)) % 4] });
        },
        over(c, l, tp, t) {
          for (const sx of [4, 10]) {
            const ph = (t * 0.8 + (sx > 7 ? 0.45 : 0)) % 1;
            R(c, l + sx, tp + 2 + Math.round(ph * 8), 1, ph < 0.2 ? 1 : 2, ph < 0.5 ? "#ffd84a" : "#ff7a1a");
          }
          for (let k = 0; k < 4; k++) {
            const ph = (t * 0.7 + k / 4) % 1;
            fade(c, 1 - ph, () => R(c, l + 2 + k * 3 + Math.round(Math.sin(t * 3 + k) * 2), tp - 4 - ph * 10, 1, 1, "#ffd84a"));
          }
        },
      },
    },
  });

  // ---------- 2. Cat Ears ----------
  function catEars(c, inner, band, opts = {}) {
    const g = makeGrid();
    const rows = [[0, 3], [0, 3], [0, 2], [0, 1]];
    const ear = (x0, dir, bend) => rows.forEach(([off, w], j) => {
      for (let i = 0; i < w; i++) g.set(x0 + dir * (off + i) + (j === 3 ? bend * dir : 0), -j, c);
    });
    ear(4, 1, 0); ear(10, -1, opts.bendR || 0);
    g.row(4, 10, 1, band);
    if (opts.notch) g.del(10, -1);
    outline(g);
    g.set(5, -1, inner); g.set(5, -2, inner); g.set(9, -1, inner); g.set(9, -2 - (opts.twitch || 0), inner);
    return g;
  }
  addTheme("head", {
    name: "Cat Ears",
    pitch: "A cat-ear headband with pink inner ears. The cutest option, and it never hides the face.",
    common: {
      pitch: "Plain cat ears.",
      colors: [
        { name: "Black cat", c: "#1f1a30", inner: "#ff8fb8" },
        { name: "Orange tabby", c: "#e0661a", inner: "#ffc0a0" },
        { name: "Snow white", c: "#f3efe6", inner: "#ff8fb8" },
        { name: "Smoke grey", c: "#7d7591", inner: "#ffb0c8" },
        { name: "Chocolate", c: "#6b4a28", inner: "#e8a090" },
        { name: "Witch purple", c: "#6b3fa8", inner: "#d18bff" },
      ],
      make: (k) => ({ build: () => catEars(k.c, k.inner, darken(k.c, 0.6)) }),
    },
    rare: {
      name: "Alley Cat",
      pitch: "A scrappy black cat: one ear has a pink bow, the other has a notch torn out of it.",
      item: {
        build() {
          const g = catEars("#1f1a30", "#ff8fb8", "#14101c", { notch: true });
          g.set(3, -1, "#ff6fb5"); g.set(5, 0, "#ff6fb5"); g.set(4, 0, "#ffb0d8"); g.set(3, 0, "#ff6fb5"); g.set(5, -1, "#ff6fb5");
          return g;
        },
      },
    },
    epic: {
      name: "Twitchy Ears",
      pitch: "Orange tabby ears that twitch and flick every few seconds, like the cat just heard something.",
      item: {
        build(t) {
          const ph = t % 2.8;
          const flick = !reduced && ph > 2.2 && Math.floor(ph * 10) % 2 === 0;
          return catEars("#e0661a", "#ffc0a0", "#8f3c06", { bendR: flick ? 1 : 0, twitch: flick ? 1 : 0 });
        },
      },
    },
    legendary: {
      name: "Ghost Cat",
      pitch: "Glowing spirit-cat ears with ghostly whiskers that flicker across the cheeks and little sparkles floating around.",
      item: {
        under: (c, l, tp, t) => glow(c, l + 7, tp - 1, 12, "#7dfcff", 0.35 + 0.1 * Math.sin(t * 3)),
        build(t) {
          const g = catEars(Math.sin(t * 3) > 0 ? "#d8fbff" : "#b8feff", "#7dfcff", "#3ac6d6");
          return g;
        },
        over(c, l, tp, t) {
          if (Math.sin(t * 5) > -0.6) {
            const col = "#b8feff";
            [[2, 5], [3, 5], [2, 6], [11, 5], [12, 5], [12, 6]].forEach(([x, y]) => fade(c, 0.85, () => R(c, l + x, tp + y, 1, 1, col)));
          }
          for (let k = 0; k < 3; k++) {
            const a = t * 1.2 + (k * TAU) / 3;
            sparkle(c, Math.round(l + 7 + Math.cos(a) * 7), Math.round(tp - 2 + Math.sin(a) * 3), tw(t, k) ? "#ffffff" : "#7dfcff", tw(t, k));
          }
        },
      },
    },
  });

  // ---------- 3. Mummy Wraps ----------
  const WRAP = [[5, 8], [4, 9], [4, 10], [4, 10], [4, 9], [4, 9], [5, 8]];
  function mummy(P, t, opts = {}) {
    const g = makeGrid();
    WRAP.forEach(([x0, x1], y) => {
      for (let x = x0; x <= x1; x++) {
        const band = (x + y * 2) % 4;
        let col = band === 0 ? P.sh : band === 2 ? P.hi : P.base;
        if (opts.px) col = opts.px(x, y, col) || col;
        g.set(x, y, col);
      }
    });
    outline(g);
    g.set(8, 4, opts.eye || "#1a1024"); g.set(9, 4, opts.eyeWhite || "#f3efe6");
    g.set(5, 4, P.sh);
    const fl = reduced ? 0 : Math.sin(t * (opts.flutter || 4));
    const tail = [[3, 2], [2, 3], [1, 3 + Math.round(fl)], [0, 4 + Math.round(fl * 1.5)]];
    if (opts.longTail) tail.push([-1, 4 + Math.round(fl * 2)], [-2, 5 + Math.round(fl * 2.5)]);
    tail.forEach(([x, y]) => { g.set(x, y, P.base); g.set(x, y + 1, P.sh); });
    return g;
  }
  addTheme("head", {
    name: "Mummy Wraps",
    pitch: "The whole head wrapped in old bandages, one eye peeking out and a loose end fluttering behind.",
    common: {
      pitch: "Plain wraps.",
      colors: [
        { name: "Linen", base: "#d9cfb2", hi: "#e8e0c8", sh: "#b9ae94" },
        { name: "Ash grey", base: "#a49db0", hi: "#c9c2d9", sh: "#7d7591" },
        { name: "Tea-stained", base: "#c0a070", hi: "#d9bc8a", sh: "#957848" },
        { name: "Soot black", base: "#3a3646", hi: "#55506b", sh: "#231d33" },
        { name: "Moss", base: "#8a9a6a", hi: "#a8b888", sh: "#65744a" },
        { name: "Dusty rose", base: "#c89a9a", hi: "#e0b8b8", sh: "#9a7070" },
      ],
      make: (P) => ({ build: (t) => mummy(P, t) }),
    },
    rare: {
      name: "Pharaoh Wraps",
      pitch: "Royal wraps painted with ancient gold symbols and a blue band across the brow.",
      item: {
        build: (t) => mummy({ base: "#d9cfb2", hi: "#e8e0c8", sh: "#b9ae94" }, t, {
          px: (x, y) => (y === 2 ? (x % 2 ? "#2a4a8f" : "#ffc53a") : at([[5, 0], [8, 1], [6, 5], [9, 6], [4, 6]], x, y) ? "#e8a820" : null),
        }),
      },
    },
    epic: {
      name: "Unraveling",
      pitch: "A long loose strip whips around in the wind and little puffs of tomb dust shake off the wraps.",
      item: {
        build: (t) => mummy({ base: "#d9cfb2", hi: "#e8e0c8", sh: "#b9ae94" }, t, { longTail: true, flutter: 6 }),
        over(c, l, tp, t) {
          for (let k = 0; k < 4; k++) {
            const ph = (t * 0.5 + k / 4) % 1;
            fade(c, 0.6 * (1 - ph), () => R(c, l + 4 + k * 2 + Math.round(ph * (k % 2 ? 3 : -3)), tp + 1 - ph * 6, 1, 1, "#c9b896"));
          }
        },
      },
    },
    legendary: {
      name: "Cursed Pharaoh",
      pitch: "The wraps hum with a curse: the eye burns green, the bandages glow at the seams, and glowing hieroglyphs orbit the head.",
      item: {
        under: (c, l, tp, t) => glow(c, l + 7, tp + 3, 14, "#5ee84a", 0.3 + 0.1 * Math.sin(t * 4)),
        build: (t) => mummy({ base: "#d9cfb2", hi: "#e8e0c8", sh: "#7a9a5a" }, t, {
          eye: Math.sin(t * 6) > 0 ? "#b7ff9e" : "#5ee84a", eyeWhite: "#2f8a3a",
          px: (x, y) => ((x + y * 2) % 4 === 0 && Math.sin(t * 3 + y) > 0.4 ? "#7dff5a" : null),
        }),
        over(c, l, tp, t) {
          const GLYPHS = [["g.g", "ggg", ".g."], [".g.", "g.g", ".g."], ["gg.", ".g.", ".gg"], ["g..", "ggg", "g.."]];
          GLYPHS.forEach((rows, k) => {
            const a = t * 0.9 + (k * TAU) / 4;
            if (Math.sin(a) < -0.3) return;
            spr(c, rows, { g: tw(t, k) ? "#b7ff9e" : "#5ee84a" }, Math.round(l + 7 + Math.cos(a) * 9) - 1, Math.round(tp + 2 + Math.sin(a) * 4) - 1);
          });
        },
      },
    },
  });

  // ---------- 4. Reaper Hood ----------
  const HOOD = [[5, 9], [4, 10], [3, 11], [3, 11], [3, 11], [3, 11], [3, 11], [3, 11], [2, 12], [2, 12]];
  function hood(P, t, opts = {}) {
    const g = makeGrid();
    HOOD.forEach(([x0, x1], j) => {
      const y = j - 2;
      for (let x = x0; x <= x1; x++) {
        if (opts.tatter && j >= 8 && (x + j) % 3 === 0) continue;
        g.set(x, y, x === x0 ? P.hi : x >= x1 - 1 ? P.sh : P.base);
      }
    });
    g.set(7, -3, P.base);
    outline(g);
    for (let y = 2; y <= 7; y++) for (let x = 5; x <= 9; x++) if (!(y === 7 && (x === 5 || x === 9))) g.set(x, y, opts.inside ? opts.inside(x, y) : "#07040f");
    if (opts.patch) { g.set(10, 0, "#3a3646"); g.set(10, 1, "#3a3646"); g.set(11, 0, "#a99bc9"); }
    const eye = opts.eye || "#d8f0ff";
    if (!blinkAt(t, 4) && !opts.noEyes) { g.set(5, 4, eye); g.set(8, 4, eye); }
    return g;
  }
  addTheme("head", {
    name: "Reaper Hood",
    pitch: "A deep hood that drapes to the shoulders, with the face lost in shadow and two pale eyes inside.",
    common: {
      pitch: "Plain hood.",
      colors: [
        { name: "Grave black", base: "#231d33", hi: "#3a3150", sh: "#141020" },
        { name: "Ash grey", base: "#5a5468", hi: "#7d7591", sh: "#3a3646" },
        { name: "Blood red", base: "#7a1422", hi: "#a81e30", sh: "#520c17" },
        { name: "Bone", base: "#c9c2b0", hi: "#e8e0d0", sh: "#958f80" },
        { name: "Midnight", base: "#1c2a5c", hi: "#2e4488", sh: "#121c40" },
        { name: "Moss", base: "#2f4a2a", hi: "#456b36", sh: "#1f331c" },
      ],
      make: (P) => ({ build: (t) => hood(P, t) }),
    },
    rare: {
      name: "Tattered Hood",
      pitch: "An ancient, moth-eaten hood with a ragged hem and a crude stitched patch.",
      item: { build: (t) => hood({ base: "#2a2433", hi: "#4a4060", sh: "#16121f" }, t, { tatter: true, patch: true }) },
    },
    epic: {
      name: "Smoldering Eyes",
      pitch: "The eyes inside glow brighter and dimmer while wisps of smoke leak out of the hood.",
      item: {
        build: (t) => hood({ base: "#231d33", hi: "#3a3150", sh: "#141020" }, t, { eye: Math.sin(t * 3) > 0 ? "#ff6b7a" : "#c42a3e" }),
        under: (c, l, tp, t) => glow(c, l + 7, tp + 4, 6, "#ff3b4d", 0.2 + 0.15 * Math.sin(t * 3)),
        over(c, l, tp, t) {
          for (let k = 0; k < 4; k++) {
            const ph = (t * 0.55 + k / 4) % 1;
            fade(c, 0.6 * (1 - ph), () => R(c, l + 6 + (k % 3) + Math.round(Math.sin(t * 2 + k) * 2 * ph), tp + 2 - ph * 10, ph > 0.5 ? 2 : 1, 1, "#7d7591"));
          }
        },
      },
    },
    legendary: {
      name: "Void Hood",
      pitch: "Inside the hood there's no face, only a twinkling starfield, while blue soul-flames drift around it.",
      item: {
        under: (c, l, tp, t) => glow(c, l + 7, tp + 3, 15, "#4fb2ff", 0.3 + 0.1 * Math.sin(t * 2)),
        build: (t) => hood({ base: "#140f26", hi: "#2a2050", sh: "#0a0718" }, t, {
          noEyes: true,
          inside: (x, y) => (hash(x, y, Math.floor(t * 2)) > 0.82 ? "#ffffff" : hash(x, y) > 0.7 ? "#4a3a8f" : "#07040f"),
        }),
        over(c, l, tp, t) {
          for (let k = 0; k < 3; k++) {
            const a = t * 0.8 + (k * TAU) / 3;
            const x = Math.round(l + 7 + Math.cos(a) * 8), y = Math.round(tp + 3 + Math.sin(a) * 4);
            R(c, x, y, 1, 2, "#7dc8ff"); R(c, x, y - 1, 1, 1, "#d8f0ff");
            fade(c, 0.5, () => R(c, x, y + 2, 1, 1, "#4fb2ff"));
          }
        },
      },
    },
  });

  // ---------- 5. Frankenstein Flat-Top ----------
  function flatTop(hair, opts = {}) {
    const g = makeGrid();
    for (let y = -2; y <= 1; y++) g.row(4, 10, y, y === -2 ? lighten(hair, 0.15) : hair);
    g.row(3, 3, 0, hair); g.row(11, 11, 0, hair); g.row(3, 3, 1, hair); g.row(11, 11, 1, hair);
    [4, 6, 8, 10].forEach((x) => g.set(x, 2, hair));
    outline(g);
    if (opts.face) for (let y = 3; y <= 6; y++) for (let x = 4; x <= 9; x++) {
      if (y === 6 && (x < 5 || x > 8)) continue;
      if (at([[5, 4], [8, 4]], x, y)) continue;
      g.set(x, y, opts.face(x, y));
    }
    // scar with stitches across the forehead
    g.row(5, 8, 3, "#6b2a3a"); g.set(5, 2, opts.stitch || "#1a1024"); g.set(7, 2, opts.stitch || "#1a1024");
    // neck bolts
    const bolt = opts.bolt || "#a49db0";
    g.set(4, 7, bolt); g.set(3, 7, darken(bolt, 0.7)); g.set(9, 7, bolt); g.set(10, 7, darken(bolt, 0.7));
    return g;
  }
  const GREEN_FACE = (x, y) => (x === 9 || y === 6 ? "#5a8a4a" : "#7aac62");
  addTheme("head", {
    name: "Frankenstein Flat-Top",
    pitch: "The monster's square flat-top haircut, a stitched scar across the forehead and bolts in the neck.",
    common: {
      pitch: "Flat-top, scar and bolts.",
      colors: [
        { name: "Jet black", c: "#1a1622" },
        { name: "Swamp green", c: "#2f4a2a" },
        { name: "Ash grey", c: "#55506b" },
        { name: "Dark brown", c: "#3d2618" },
        { name: "Navy", c: "#1c2a5c" },
        { name: "Bruise purple", c: "#3a2050" },
      ],
      make: (k) => ({ build: () => flatTop(k.c) }),
    },
    rare: {
      name: "Monster Makeup",
      pitch: "The full look: green monster face paint, dark eye shadow and a black flat-top.",
      item: { build: () => { const g = flatTop("#1a1622", { face: GREEN_FACE }); g.set(5, 3, "#2f4a2a"); g.set(8, 3, "#2f4a2a"); g.row(5, 8, 6, "#3a5a32"); return g; } },
    },
    epic: {
      name: "Sparking Bolts",
      pitch: "The neck bolts crackle: every couple of seconds blue sparks jump off them.",
      item: {
        build: (t) => flatTop("#1a1622", { face: GREEN_FACE, bolt: Math.floor(t * 8) % 5 === 0 ? "#d8f0ff" : "#a49db0" }),
        over(c, l, tp, t) {
          const ph = t % 1.8;
          if (ph > 0.5) return;
          let s = Math.floor(t * 12) * 9301 + 49297;
          const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
          for (const sx of [2, 11]) for (let k = 0; k < 3; k++) R(c, l + sx + Math.round((rnd() - 0.5) * 4), tp + 7 + Math.round((rnd() - 0.5) * 4), 1, 1, k ? "#7dc8ff" : "#ffffff");
        },
      },
    },
    legendary: {
      name: "It's Alive!",
      pitch: "Lightning strikes the flat-top: the hair crackles electric blue, bolts of lightning snap down from above and the whole head flashes.",
      item: {
        under: (c, l, tp, t) => glow(c, l + 7, tp, 15, "#4fb2ff", 0.3 + (Math.floor(t * 7) % 4 === 0 ? 0.3 : 0)),
        build(t) {
          const flash = Math.floor(t * 7) % 4 === 0;
          const g = flatTop(flash ? "#9fd4ff" : "#1c2a5c", { face: GREEN_FACE, bolt: flash ? "#ffffff" : "#a49db0" });
          for (let x = 4; x <= 10; x++) if (hash(x, Math.floor(t * 8)) > 0.6) g.set(x, -2, "#d8f0ff");
          return g;
        },
        over(c, l, tp, t) {
          const step = Math.floor(t * 7);
          if (step % 4 > 1) return;
          let x = l + 4 + (step * 3) % 7, y = tp - 14;
          for (let k = 0; k < 10; k++) { R(c, x, y, 1, 1, k < 3 ? "#ffffff" : "#9fd4ff"); y++; x += hash(step, k) > 0.5 ? 1 : -1; }
        },
      },
    },
  });

  // ---------- 6. Skull Mask ----------
  function skull(P, opts = {}) {
    const g = makeGrid();
    ellipse(g, 7, 2.2, 3.6, 4.2, (x, y, x0, x1) => (x === x0 ? P.hi : x >= x1 ? P.sh : P.base));
    g.row(5, 9, 7, P.base);
    outline(g);
    const hole = opts.hole || "#0b0614";
    [[5, 3], [6, 3], [5, 4], [6, 4], [8, 3], [9, 3], [8, 4], [9, 4], [7, 5]].forEach(([x, y]) => g.set(x, y, hole));
    const jaw = opts.jaw || 0;
    for (let x = 5; x <= 9; x++) g.set(x, 6 + jaw, x % 2 ? "#0b0614" : P.base);
    if (jaw) g.row(5, 9, 6, "#0b0614");
    if (opts.decor) opts.decor(g);
    return g;
  }
  addTheme("head", {
    name: "Skull Mask",
    pitch: "A full skull mask over the face: hollow eye sockets, a little nose hole and a toothy grin.",
    common: {
      pitch: "Plain skull mask.",
      colors: [
        { name: "Bone", base: "#ece6d6", hi: "#ffffff", sh: "#b9ae94" },
        { name: "Ash", base: "#a49db0", hi: "#c9c2d9", sh: "#7d7591" },
        { name: "Obsidian", base: "#3a3646", hi: "#55506b", sh: "#231d33" },
        { name: "Blood", base: "#a81e30", hi: "#e0384e", sh: "#6e0f1d" },
        { name: "Jade", base: "#3a9a6a", hi: "#5ec48a", sh: "#246a46" },
        { name: "Pumpkin", base: "#e0661a", hi: "#ff9a3a", sh: "#a8470a" },
      ],
      make: (P) => ({ build: () => skull(P) }),
    },
    rare: {
      name: "Sugar Skull",
      pitch: "A Day of the Dead sugar skull with flower-ringed eyes, a pink nose and colorful painted details.",
      item: {
        build: () => skull({ base: "#f3efe6", hi: "#ffffff", sh: "#c9c2b0" }, {
          hole: "#2a1a4a",
          decor: (g) => {
            [[4, 3], [7, 2], [10, 3], [4, 5], [10, 5]].forEach(([x, y]) => g.set(x, y, "#3ac6d6"));
            [[6, 0], [8, 0], [7, -1]].forEach(([x, y]) => g.set(x, y, "#ff6fb5"));
            g.set(7, 0, "#ffd84a"); g.set(7, 5, "#ff6fb5"); g.set(5, 2, "#ff7a1a"); g.set(9, 2, "#ff7a1a");
          },
        }),
      },
    },
    epic: {
      name: "Chattering Skull",
      pitch: "The jaw clacks open and shut in bursts, and two tiny red pupils glow in the sockets.",
      item: {
        build(t) {
          const ph = t % 2.4;
          const jaw = !reduced && ph < 1 && Math.floor(ph * 8) % 2 === 0 ? 1 : 0;
          return skull({ base: "#ece6d6", hi: "#ffffff", sh: "#b9ae94" }, {
            jaw,
            decor: (g) => { if (!blinkAt(t)) { g.set(6, 4, "#ff3b4d"); g.set(8, 4, "#ff3b4d"); } },
          });
        },
      },
    },
    legendary: {
      name: "Flaming Skull",
      pitch: "A skull wreathed in ghostly blue fire: flames roar off the top, the sockets burn and sparks drift away.",
      item: {
        under: (c, l, tp, t) => glow(c, l + 7, tp + 1, 16, "#4fb2ff", 0.4 + 0.12 * Math.sin(t * 11)),
        build: (t) => skull({ base: "#ece6d6", hi: "#ffffff", sh: "#9fb8d8" }, {
          decor: (g) => {
            const f = Math.floor(t * 10) % 2 ? "#d8f0ff" : "#4fb2ff";
            [[5, 3], [6, 3], [5, 4], [6, 4], [8, 3], [9, 3], [8, 4], [9, 4]].forEach(([x, y]) => g.set(x, y, f));
          },
        }),
        over(c, l, tp, t) {
          const COLS = ["#ffffff", "#d8f0ff", "#7dc8ff", "#4fb2ff", "#2a4a8f"];
          for (let s = -3; s <= 3; s++) {
            const h = 9 - Math.abs(s) * 1.7;
            for (let k = 0; k < 3; k++) {
              const ph = (t * 2.2 + k / 3 + (s + 3) * 0.21) % 1;
              fade(c, 1 - ph * 0.6, () => R(c, l + 7 + s + Math.round(Math.sin(t * 9 + s + k) * ph), tp - 3 - ph * h, 1, 1, COLS[Math.min(4, Math.floor(ph * 5))]));
            }
          }
        },
      },
    },
  });

  // ---------- 7. Spider Friend ----------
  function spider(P, t, opts = {}) {
    const g = makeGrid();
    // round abdomen up top, small head below it resting on the hair
    ellipse(g, 7, -4.5, 2.6, 2.1, (x, y, x0) => (x === x0 ? P.hi : opts.abdomen ? opts.abdomen(x, y) || P.base : P.base));
    ellipse(g, 7, -1.5, 1.6, 1.1, () => P.base);
    outline(g);
    // thin legs drawn after the outline so they stay spindly: knees up, feet down on the hair
    const wig = opts.wiggle ? Math.floor(t * 8) % 2 : 0;
    const legs = [[[4, -5], [3, -6], [2, -6], [1, -5], [1, -4]], [[4, -4], [3, -4], [2, -3], [2, -2]], [[4, -3], [3, -2], [3, -1], [3, 0]], [[5, -1], [4, 0], [4, 1]]];
    legs.forEach((leg, li) => leg.forEach(([x, y], k) => {
      const last = k === leg.length - 1;
      g.set(x, y - (wig && last && li % 2 === 0 ? 1 : 0), P.leg);
      g.set(14 - x, y - (wig && last && li % 2 === 1 ? 1 : 0), P.leg);
    }));
    if (!opts.noEyes && !blinkAt(t, 3.1)) { const e = opts.eye || "#ff3b4d"; g.set(6, -2, e); g.set(8, -2, e); g.set(7, -1, e); }
    if (opts.hair) for (const [x, y] of [[5, -7], [7, -8], [9, -7]]) g.set(x, y, P.leg);
    return g;
  }
  addTheme("head", {
    name: "Spider Friend",
    pitch: "A big hairy spider has made itself at home on top of your head, legs gripping your hair.",
    common: {
      pitch: "A big spider.",
      colors: [
        { name: "Black", base: "#231d33", hi: "#4a4060", leg: "#16121f" },
        { name: "Tarantula brown", base: "#6b4a28", hi: "#8a6a3e", leg: "#3d2618" },
        { name: "Ash grey", base: "#7d7591", hi: "#a49db0", leg: "#55506b" },
        { name: "Venom purple", base: "#52308a", hi: "#7a4ad9", leg: "#33205a" },
        { name: "Poison green", base: "#2f8a3a", hi: "#5ee84a", leg: "#1f4a28" },
        { name: "Ghost white", base: "#e8e0d0", hi: "#ffffff", leg: "#b9b0a0" },
      ],
      make: (P) => ({ build: (t) => spider(P, t, { hair: true }) }),
    },
    rare: {
      name: "Black Widow",
      pitch: "A glossy black widow with the red hourglass mark on its back.",
      item: {
        build: (t) => spider({ base: "#14101c", hi: "#3a3150", leg: "#0b0614" }, t, {
          abdomen: (x, y) => (at([[6, -6], [7, -6], [8, -6], [7, -5], [6, -4], [7, -4], [8, -4]], x, y) ? "#e0242e" : null),
          eye: "#ff8090",
        }),
      },
    },
    epic: {
      name: "Restless Spider",
      pitch: "The spider never sits still: its legs tap and shuffle and its eyes blink.",
      item: { build: (t) => spider({ base: "#6b4a28", hi: "#8a6a3e", leg: "#3d2618" }, t, { wiggle: !reduced, hair: true }) },
    },
    legendary: {
      name: "Spider Queen",
      pitch: "A huge violet queen with glowing eyes, web strands draped down past the face and a baby spider bobbing on its thread.",
      item: {
        under: (c, l, tp, t) => glow(c, l + 7, tp - 2, 14, "#c46bff", 0.35 + 0.1 * Math.sin(t * 3)),
        build(t) {
          const g = spider({ base: "#3a2060", hi: "#7a4ad9", leg: "#24143f" }, t, { eye: Math.sin(t * 4) > 0 ? "#f0d8ff" : "#c46bff", hair: true });
          g.set(7, -8, "#ffc53a"); g.set(6, -8, "#e8a820"); g.set(8, -8, "#e8a820"); g.set(6, -9, "#ffc53a"); g.set(8, -9, "#ffc53a");
          return g;
        },
        over(c, l, tp, t) {
          for (const [x, len] of [[1, 8], [13, 9]]) for (let y = -2; y < 2 + len; y++) fade(c, 0.55, () => R(c, l + x + (y % 3 === 0 ? (x < 7 ? -1 : 1) : 0), tp + y, 1, 1, "#e8e0f0"));
          const drop = 6 + Math.round((Math.sin(t * 1.6) + 1) * 2);
          for (let y = 3; y < 3 + drop; y++) fade(c, 0.7, () => R(c, l + 12, tp + y, 1, 1, "#d8d0ec"));
          R(c, l + 11, tp + 3 + drop, 3, 1, "#24143f"); R(c, l + 12, tp + 3 + drop, 1, 2, "#3a2060"); R(c, l + 12, tp + 3 + drop, 1, 1, "#c46bff");
        },
      },
    },
  });

  // ---------- 8. Candle Crown ----------
  function candles(wax, t, opts = {}) {
    const g = makeGrid();
    const band = opts.band || "#3a3646";
    g.row(4, 10, 1, band); g.row(4, 10, 0, darken(band, 0.8));
    const C = [[5, 4], [7, 6], [9, 3]];
    C.forEach(([x, h]) => {
      for (let y = 0; y < h; y++) g.set(x, -1 - y, y === h - 1 ? lighten(wax, 0.25) : wax);
    });
    // wax drips down the band
    [[5, 0], [5, 1], [7, 0], [8, 1], [9, 0]].forEach(([x, y]) => g.set(x, y, wax));
    if (opts.skull) { g.set(7, 1, "#ffc53a"); g.row(6, 8, 0, "#ffc53a"); g.set(6, 1, "#ffc53a"); g.set(8, 1, "#ffc53a"); g.set(7, 0, "#3a2300"); }
    outline(g);
    const flame = opts.flame || ((i) => ["#ffd84a", "#fff3a0"]);
    C.forEach(([x, h], i) => {
      const [a, b] = flame(i, t);
      const lean = opts.flicker ? Math.round(Math.sin(t * 13 + i * 2) * 0.7) : 0;
      g.set(x, -2 - h, a); g.set(x + lean, -3 - h, b);
      if (opts.tall) { g.set(x + lean, -4 - h, b); g.set(x, -5 - h, a); }
    });
    return g;
  }
  addTheme("head", {
    name: "Candle Crown",
    pitch: "An iron band holding three melting candles at different heights, wax dripping down the sides.",
    common: {
      pitch: "Three candles on an iron band.",
      colors: [
        { name: "Ivory", wax: "#f3efe6" },
        { name: "Black", wax: "#3a3150" },
        { name: "Witch purple", wax: "#7a4ad9" },
        { name: "Blood red", wax: "#c42a3e" },
        { name: "Pumpkin", wax: "#ff7a1a" },
        { name: "Moss green", wax: "#5a8a3a" },
      ],
      make: (k) => ({ build: (t) => candles(k.wax, t) }),
    },
    rare: {
      name: "Skull Candelabra",
      pitch: "A gold candelabra band with a little skull at the front, holding three black candles.",
      item: { build: (t) => candles("#2a2433", t, { band: "#c9a24a", skull: true }) },
    },
    epic: {
      name: "Flickering Flames",
      pitch: "The three flames dance and flicker, throwing a warm, wobbling glow on the face.",
      item: {
        under: (c, l, tp, t) => glow(c, l + 7, tp - 6, 10, "#ffb84a", 0.25 + 0.12 * Math.sin(t * 13)),
        build: (t) => candles("#f3efe6", t, { flicker: !reduced, flame: (i, tt) => (Math.sin(tt * 11 + i * 2) > 0 ? ["#ff9a3a", "#ffd84a"] : ["#ffd84a", "#fff3a0"]) }),
      },
    },
    legendary: {
      name: "Witch Fire",
      pitch: "Tall magic flames that shift from green to violet, with a big eerie glow, rising embers and curling smoke.",
      item: {
        under: (c, l, tp, t) => glow(c, l + 7, tp - 6, 16, Math.sin(t * 1.5) > 0 ? "#5ee84a" : "#c46bff", 0.4 + 0.1 * Math.sin(t * 9)),
        build: (t) => candles("#2a2433", t, {
          band: "#3a2060", tall: true, flicker: !reduced,
          flame: (i, tt) => (Math.sin(tt * 1.5 + i) > 0 ? ["#5ee84a", "#e0ffd8"] : ["#c46bff", "#f0d8ff"]),
        }),
        over(c, l, tp, t) {
          for (let k = 0; k < 5; k++) {
            const ph = (t * 0.7 + k / 5) % 1;
            fade(c, 1 - ph, () => R(c, l + 4 + k * 1.5 + Math.round(Math.sin(t * 3 + k) * 2), tp - 10 - ph * 8, 1, 1, k % 2 ? "#b7ff9e" : "#e0b0ff"));
          }
        },
      },
    },
  });

  // ---------- 9. Brain Dome ----------
  function brainDome(fluid, t, opts = {}) {
    const g = makeGrid();
    // glass dome (fluid tint), brain inside, metal collar
    ellipse(g, 7, -1.5, 4.6, 4.6, (x, y, x0, x1) => (y > 1 ? null : x === x0 + 1 && y < -2 ? "#ffffff" : fluid));
    for (const [k, v] of [...g.m]) if (v.y > 1 || v.c === null) g.m.delete(k);
    ellipse(g, 7, -1.2, 3.1, 2.3, (x, y) => {
      const fold = (x + y * 2) % 3 === 0;
      return opts.brain ? opts.brain(x, y, fold) : fold ? "#c46a8a" : "#f0a0b8";
    });
    g.row(2, 12, 2, opts.metal || "#7d7591"); g.row(3, 11, 1, opts.metal || "#7d7591");
    [3, 7, 11].forEach((x) => g.set(x, 2, opts.rivet || "#c9c2d9"));
    outline(g);
    if (opts.extra) opts.extra(g, t);
    return g;
  }
  addTheme("head", {
    name: "Brain Dome",
    pitch: "A mad-scientist glass dome on top of the head with a pink brain floating inside.",
    common: {
      pitch: "Brain in a jar, in six fluid colors.",
      colors: [
        { name: "Clear", fluid: "#9fb8d8" },
        { name: "Formula green", fluid: "#7ad48a" },
        { name: "Ice blue", fluid: "#7dc8ff" },
        { name: "Potion purple", fluid: "#a87ae0" },
        { name: "Amber", fluid: "#e0b05a" },
        { name: "Blood", fluid: "#d06070" },
      ],
      make: (k) => ({ build: (t) => brainDome(k.fluid, t) }),
    },
    rare: {
      name: "Robo Brain",
      pitch: "A brass-collared dome with rivets and a little antenna with a red bulb on top.",
      item: {
        build: (t) => brainDome("#9fb8d8", t, {
          metal: "#c9a24a", rivet: "#fff1b0",
          extra: (g) => { g.set(7, -7, "#c9a24a"); g.set(7, -8, "#c9a24a"); g.set(7, -9, "#ff3b4d"); g.set(8, -9, OUT); g.set(6, -9, OUT); g.set(7, -10, OUT); },
        }),
      },
    },
    epic: {
      name: "Big Thinker",
      pitch: "Little sparks of thought zip across the brain's folds while bubbles rise through the fluid.",
      item: {
        build: (t) => brainDome("#7ad48a", t, {
          brain: (x, y, fold) => (hash(x, y, Math.floor(t * 6)) > 0.85 ? "#ffffff" : fold ? "#c46a8a" : "#f0a0b8"),
          extra: (g, tt) => {
            for (let k = 0; k < 3; k++) {
              const ph = (tt * 0.8 + k / 3) % 1;
              const x = 4 + k * 3, y = 1 - Math.round(ph * 6);
              if (g.has(x, y)) g.set(x, y, "#e0ffd8");
            }
          },
        }),
      },
    },
    legendary: {
      name: "Galaxy Brain",
      pitch: "The brain glows with cosmic purple light, stars swirl inside the dome and lightning arcs between two antennas.",
      item: {
        under: (c, l, tp, t) => glow(c, l + 7, tp - 2, 16, "#c46bff", 0.4 + 0.12 * Math.sin(t * 3)),
        build: (t) => brainDome("#2a1a5c", t, {
          metal: "#4a4060", rivet: "#c46bff",
          brain: (x, y, fold) => (fold ? (Math.sin(t * 4 + x) > 0 ? "#f0d8ff" : "#c46bff") : "#e080ff"),
          extra: (g, tt) => {
            for (let k = 0; k < 5; k++) {
              const a = tt * 1.2 + (k * TAU) / 5;
              const x = Math.round(7 + Math.cos(a) * 3.8), y = Math.round(-1.5 + Math.sin(a) * 3.8);
              if (g.has(x, y)) g.set(x, y, "#ffffff");
            }
            for (const x of [3, 11]) { g.set(x, -5, "#7d7591"); g.set(x, -6, "#7d7591"); g.set(x, -7, "#f0d8ff"); }
          },
        }),
        over(c, l, tp, t) {
          if (Math.floor(t * 6) % 3 === 0) return;
          let y = tp - 7;
          for (let x = l + 4; x <= l + 10; x++) { R(c, x, y, 1, 1, hash(x - l, Math.floor(t * 12)) > 0.5 ? "#ffffff" : "#e0b0ff"); y += hash(x - l, Math.floor(t * 12), 3) > 0.5 ? 1 : -1; y = Math.max(tp - 9, Math.min(tp - 6, y)); }
        },
      },
    },
  });

  // ---------- 10. Plague Doctor Mask ----------
  function plague(P, t, opts = {}) {
    const g = makeGrid();
    const hat = opts.hat || "#1a1622";
    // wide-brim hat
    g.row(1, 13, 0, darken(hat, 0.8));
    for (let y = -4; y <= -1; y++) g.row(4, 10, y, y === -4 ? lighten(hat, 0.15) : hat);
    g.row(4, 10, -1, opts.band || "#5a3428");
    // mask over the face with a beak that hangs down over the chest
    for (let y = 1; y <= 6; y++) g.row(4, 10, y, y === 1 ? P.sh : P.base);
    g.row(6, 8, 7, P.base); g.row(6, 8, 8, P.sh); g.set(7, 9, P.base); g.set(7, 10, P.sh);
    g.row(4, 4, 2, P.hi);
    outline(g);
    const lens = opts.lens || "#c9c2d9";
    for (const x of [5, 8]) { g.set(x, 3, lens); g.set(x + 1, 3, lens); g.set(x, 4, lens); g.set(x + 1, 4, darken(lens, 0.8)); }
    if (opts.rim) for (const [x, y] of [[4, 3], [7, 3], [10, 3], [4, 4], [7, 4], [10, 4]]) g.set(x, y, opts.rim);
    g.row(6, 8, 6, darken(P.base, 0.7));
    return g;
  }
  addTheme("head", {
    name: "Plague Doctor",
    pitch: "A wide-brimmed hat over a leather beak mask with round glass eyes. Creepy, old-world and instantly recognizable.",
    common: {
      pitch: "Hat and beak mask in six leathers.",
      colors: [
        { name: "Black leather", base: "#2a2433", hi: "#4a4060", sh: "#16121f" },
        { name: "Saddle brown", base: "#6b4a28", hi: "#8a6a3e", sh: "#3d2618" },
        { name: "Bone white", base: "#d9cfb2", hi: "#f3efe6", sh: "#a8987a" },
        { name: "Crimson", base: "#7a1422", hi: "#a81e30", sh: "#520c17" },
        { name: "Bronze", base: "#8a6a2a", hi: "#c9a24a", sh: "#5a4418" },
        { name: "Slate", base: "#55506b", hi: "#7d7591", sh: "#3a3646" },
      ],
      make: (P) => ({ build: (t) => plague(P, t) }),
    },
    rare: {
      name: "Brass Goggles",
      pitch: "A black mask fitted with brass-rimmed goggles and blood-red lenses.",
      item: { build: (t) => plague({ base: "#2a2433", hi: "#4a4060", sh: "#16121f" }, t, { lens: "#e0384e", rim: "#c9a24a", band: "#c9a24a" }) },
    },
    epic: {
      name: "Herb Smoke",
      pitch: "Puffs of herbal smoke drift out of the beak's tip and the glass eyes catch a passing glint.",
      item: {
        build(t) {
          const glint = (t % 2.5) < 0.2;
          return plague({ base: "#6b4a28", hi: "#8a6a3e", sh: "#3d2618" }, t, { lens: glint ? "#ffffff" : "#c9c2d9" });
        },
        over(c, l, tp, t) {
          for (let k = 0; k < 4; k++) {
            const ph = (t * 0.5 + k / 4) % 1;
            fade(c, 0.6 * (1 - ph), () => R(c, l + 7 + Math.round(ph * 4 + Math.sin(t * 2 + k)), tp + 10 - ph * 5, ph > 0.4 ? 2 : 1, ph > 0.4 ? 2 : 1, "#b9d0a8"));
          }
        },
      },
    },
    legendary: {
      name: "Raven Lord",
      pitch: "A feathered black mask with burning red eyes, black feathers drifting down and a raven circling the hat.",
      item: {
        under: (c, l, tp, t) => glow(c, l + 7, tp + 2, 15, "#c42a3e", 0.3 + 0.1 * Math.sin(t * 3)),
        build(t) {
          const g = plague({ base: "#16121f", hi: "#3a3150", sh: "#0b0614" }, t, { lens: Math.sin(t * 4) > 0 ? "#ff3b4d" : "#ff8090", hat: "#16121f", band: "#8f1426" });
          for (const [x, y] of [[3, 0], [11, 0], [1, 1], [13, 1], [5, -5], [9, -5]]) g.set(x, y, "#2a2050");
          return g;
        },
        over(c, l, tp, t) {
          const a = t * 1.3;
          const x = Math.round(l + 7 + Math.cos(a) * 9), y = Math.round(tp - 6 + Math.sin(a) * 2);
          const flap = Math.floor(t * 8) % 2;
          spr(c, flap ? ["k...k", ".kkk.", "..k.."] : [".....", "kkkkk", "..k.."], { k: "#0b0614" }, x - 2, y - 1);
          R(c, x, y, 1, 1, "#ff3b4d");
          for (let k = 0; k < 3; k++) {
            const ph = (t * 0.35 + k / 3) % 1;
            fade(c, 1 - ph, () => R(c, l + 2 + k * 5 + Math.round(Math.sin(t * 2 + k) * 2), tp + 2 + ph * 14, 1, 2, "#2a2050"));
          }
        },
      },
    },
  });
})();
