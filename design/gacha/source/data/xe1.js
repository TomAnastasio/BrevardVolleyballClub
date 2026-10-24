// Epic transformations 1-20. Strong silhouettes, one small animation each.
(() => {
  // tiny pixel-map builder for shapes that are easier to compute than to type
  const M = (w, h) => Array.from({ length: h }, () => Array(w).fill("."));
  const put = (m, x, y, ch) => { if (y >= 0 && y < m.length && x >= 0 && x < m[0].length) m[y][x] = ch; };
  const rect = (m, x, y, w, h, ch) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) put(m, i, j, ch); };
  const oval = (m, cx, cy, rx, ry, ch) => {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      const d = 1 - ((y - cy) / ry) ** 2;
      if (d < 0) continue;
      const half = Math.sqrt(d) * rx;
      for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) put(m, x, y, ch);
    }
  };
  const line = (m, x0, y0, x1, y1, ch) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let k = 0; k <= n; k++) put(m, Math.round(x0 + ((x1 - x0) * k) / (n || 1)), Math.round(y0 + ((y1 - y0) * k) / (n || 1)), ch);
  };
  const rows = (m) => m.map((r) => r.join(""));
  const blink = (t, every = 3.6) => t % every > every - 0.18;

  // 1 ---------------------------------------------------------------
  addSkin("epic", {
    name: "Headless Horseman",
    pitch: "A towering rider whose long coat flares out to the ground, with a flickering stump of fire for a neck and a jack-o'-lantern held high over where his head should be.",
    pal: { f: "#ff7a1a", F: "#ffd84a", k: "#1a1024", c: "#2e2546", C: "#1c1630", r: "#8f1426", y: "#c9a24a", g: "#4a4060", p: "#3a3646", b: "#4a3020", B: "#2a1a0e", o: "#ff7a1a", O: "#c4550a", Y: "#ffd84a", v: "#4a7a28" },
    animPal: (t) => (Math.floor(t * 8) % 2 ? { f: "#ffd84a", F: "#ff7a1a" } : {}),
    rows: [
      "...............v..",
      "..............ooOo",
      ".............oYoYO",
      ".............oooOO",
      ".............oYYYO",
      "..............oOO.",
      "...............g..",
      "........fF.....c..",
      ".......fFFf....c..",
      "........kk.....c..",
      "......cCrrCc..cc..",
      "....cccCrrCcccc...",
      "...cccccccccccc...",
      "..gccccccyccccC...",
      "..cccccccccccccC..",
      "..ccccccyccccccC..",
      ".cccccccccccccccC.",
      ".ccccccccccccccccC",
      "ccccccc.pp.ccccccC",
      "cccccc..pp..cccccC",
      "ccccc..pp.pp.ccccC",
      ".ccc...pp.pp..ccC.",
      "..c....pp.pp...c..",
      "......bbb.bbb.....",
      "......bbb.bbb.....",
      "......bbb.bbb.....",
      ".....bbbb.bbbb....",
      ".....BBBB.BBBB....",
    ],
  });

  // 2 ---------------------------------------------------------------
  addSkin("epic", {
    name: "Grim Reaper",
    pitch: "A huge hooded robe that spreads into a ragged bell as it floats, two red pinpricks for eyes, and a scythe whose blade arcs over the whole figure.",
    pal: { r: "#262036", R: "#16121f", k: "#07040f", e: "#ff3b4d", h: "#d8d0c0", s: "#5a3a20", b: "#c9c2d9", B: "#ffffff" },
    float: () => 1,
    animPal: (t) => (blink(t, 4) ? { e: "#07040f" } : {}),
    rows: [
      "..bbbbbbbbB.......",
      ".bb.......bbB.....",
      ".s..........B.....",
      ".s......rrr.......",
      ".s.....rrrrr......",
      ".s....rrrrrrr.....",
      ".s....rRkkkRr.....",
      ".s....rkekekr.....",
      ".s....rkkkkkr.....",
      ".s...rrRkkkRrr....",
      ".s..rrrrrrrrrrr...",
      ".s.rrrrrrrrrrrrr..",
      ".hrrrrrrrrrrrrrrr.",
      ".srrrrrrrrrrrrrRr.",
      ".s.rrrrrrrrrrrrRr.",
      ".s.rrrrrrrrrrrrRr.",
      ".s.rrrrrrrrrrrrRr.",
      ".s..rrrrrrrrrrrR..",
      ".s.rrrrrrrrrrrrRr.",
      ".s.rrrrrrrrrrrrRr.",
      ".srrrrrrrrrrrrrrRr",
      ".srrrrrrrrrrrrrrRr",
      "rrrrrrrrrrrrrrrrRr",
      "rrrrrrrrrrrrrrrrRr",
      "r.rr.rrr.rrr.rr.r.",
    ],
  });

  // 3 ---------------------------------------------------------------
  addSkin("epic", {
    name: "Werewolf",
    pitch: "A hulking wolf hunched on all fours, knuckles on the ground, jaws open, glowing eyes, and shorts in tatters.",
    pal: { F: "#3a2614", f: "#6b4a28", l: "#a8844e", y: "#ffd84a", n: "#8a6a3e", k: "#1a1024", w: "#f3efe6", p: "#3a4a78", c: "#ece6d6" },
    animPal: (t) => (blink(t, 3.4) ? { y: "#6b4a28" } : {}),
    rows: [
      "...F.......F......",
      "...FF.....FF......",
      "...FffffffffF.....",
      "..ffffffffffff....",
      "..ffyyffffyyff....",
      "..ffffffffffffnn..",
      "...ffffffffnnnnk..",
      "...ffffwfwfwnnn...",
      "...ffffffffwfw....",
      ".fffffllllllffff..",
      "ffffflllllllfffff.",
      "fffffllllllllffff.",
      "ffff.lllllll.ffff.",
      "fff..lllllll..fff.",
      "fff..fffffff..fff.",
      "fff..ppppppp..fff.",
      "ff...pppp.ppp..ff.",
      "ff...ff.....ff..ff",
      "cc..fff.....fff.cc",
      "....ff.......ff...",
      "...fff.......fff..",
      "..ffff.......ffff.",
      ".cfcf.........fcfc",
    ],
  });

  // 4 ---------------------------------------------------------------
  addSkin("epic", {
    name: "Frankenstein's Monster",
    pitch: "A giant, square-shouldered monster that fills the whole box: flat-topped green head, stitched brow, neck bolts that spark now and then, and enormous boots.",
    pal: { h: "#14101c", g: "#6b9a52", G: "#4a7038", b: "#a49db0", k: "#1a1024", w: "#f3efe6", m: "#2f3a2a", j: "#2e2840", J: "#1c1828", p: "#3a3646", B: "#14101c" },
    animPal: (t) => (Math.floor(t * 3) % 7 === 0 ? { b: "#ffffff" } : {}),
    rows: [
      "....hhhhhhhhhh....",
      "....hhhhhhhhhh....",
      "....gkgkgkgggg....",
      "...bGGGGGGGGGGb...",
      "...bgwkggggwkgb...",
      "....ggggggggggG...",
      "....ggmmmmmmggG...",
      "....gggwgwggggG...",
      ".....gggggggg.....",
      ".......gggg.......",
      ".jjjjjjjjjjjjjjjJ.",
      "jjjjjjjjjjjjjjjjJJ",
      "jjj.jjjjjjjjjJ.jjj",
      "jjj.jjjjjjjjjJ.jjj",
      "jjj.jjjjjjjjjJ.jjj",
      "ggg.jjjjjjjjjJ.ggg",
      "ggg.pppppppppp.ggg",
      "GGG.ppppp.pppp.GGG",
      "....pppp..pppp....",
      "....pppp..pppp....",
      "....ggpp..ppgg....",
      "....pppp..pppp....",
      "...BBBBB..BBBBB...",
      "..BBBBBB..BBBBBB..",
      "..BBBBBB..BBBBBB..",
    ],
  });

  // 5 ---------------------------------------------------------------
  addSkin("epic", {
    name: "Vampire Count",
    pitch: "The cape is the whole silhouette: it rises into tall points either side of a pale, red-eyed face and drapes all the way out to the edges.",
    pal: { h: "#14101c", s: "#e0d8e8", S: "#b8aec8", e: "#ff3b4d", f: "#ffffff", m: "#5c0c18", c: "#16111f", C: "#8f1426", w: "#f3efe6", v: "#8f1426", p: "#1a1622", b: "#0b0614" },
    animPal: (t) => (blink(t, 4.2) ? { e: "#e0d8e8" } : {}),
    rows: [
      "CC..............CC",
      "CC....hhhhhh....CC",
      "CCC..hhhhhhhh..CCC",
      "cCCC.hhhshhhh.CCCc",
      "cCCC.hsssssSh.CCCc",
      "ccCC.seSsseSs.CCcc",
      "ccCC.sssssssS.CCcc",
      "cccC..smffmS..Cccc",
      "cccCC..ssss..CCccc",
      "cccCCcwwvvwwcCCccc",
      "ccccCcwwvvwwcCcccc",
      "ccccCcvvvvvvcCcccc",
      "ccccCcvvvvvvcCcccc",
      "ccccCcvvvvvvcCcccc",
      "cccc.cppppppc.cccc",
      ".ccc.cppppppc.ccc.",
      ".ccc..pp..pp..ccc.",
      "..cc..pp..pp..cc..",
      "..c...pp..pp...c..",
      "......pp..pp......",
      "......pp..pp......",
      ".....bbb..bbb.....",
      ".....bbb..bbb.....",
    ],
  });

  // 6 ---------------------------------------------------------------
  {
    const m = M(18, 20);
    oval(m, 8.5, 5, 6, 4.6, "g");
    ["f", "f", "f"].forEach((_, i) => { put(m, 5 + i * 3, 0, "f"); put(m, 5 + i * 3, 1, "f"); });
    put(m, 2, 3, "f"); put(m, 1, 2, "f"); put(m, 15, 3, "f"); put(m, 16, 2, "f");
    rect(m, 4, 4, 3, 3, "e"); rect(m, 11, 4, 3, 3, "e"); put(m, 4, 4, "w"); put(m, 11, 4, "w");
    rect(m, 6, 8, 6, 1, "m");
    oval(m, 8.5, 12, 6, 3.4, "g");
    rect(m, 6, 10, 6, 4, "l");
    put(m, 4, 11, "G"); put(m, 4, 12, "G"); put(m, 13, 11, "G"); put(m, 13, 12, "G");
    // arms with webbed hands on the ground
    line(m, 2, 10, 1, 15, "g"); line(m, 15, 10, 16, 15, "g");
    rect(m, 0, 16, 3, 1, "f"); rect(m, 15, 16, 3, 1, "f");
    // the tail curls round in front instead of legs
    oval(m, 8.5, 16, 5, 2.4, "g");
    rect(m, 5, 18, 8, 1, "G");
    line(m, 13, 17, 16, 19, "f"); line(m, 12, 18, 17, 18, "f"); put(m, 17, 19, "f"); put(m, 15, 19, "f");
    put(m, 7, 14, "s"); put(m, 10, 15, "s"); put(m, 3, 9, "s");
    addSkin("epic", {
      name: "Swamp Creature",
      pitch: "A short, round lagoon merman with a crest of fins, huge black eyes, webbed hands propped on the ground and a fish tail curled up in front.",
      pal: { g: "#3f7a5a", G: "#2a5a40", l: "#8ac49a", f: "#2a9a8a", e: "#07040f", w: "#b8feff", m: "#1a3a2a", s: "#5a7a28" },
      animPal: (t) => (blink(t, 3) ? { e: "#3f7a5a", w: "#3f7a5a" } : {}),
      rows: rows(m),
    });
  }

  // 7 ---------------------------------------------------------------
  addSkin("epic", {
    name: "Living Scarecrow",
    pitch: "A scarecrow strung across its crossbar from edge to edge, burlap head under a wide straw hat, straw bursting from its sleeves, standing on its post.",
    pal: { y: "#d9a441", Y: "#a8792a", b: "#a8844e", k: "#1a1024", o: "#ff7a1a", r: "#8f2a1a", R: "#c4402a", x: "#3a2a1a", s: "#f3d27a", w: "#6b4a28", W: "#3a2614", c: "#231d33", C: "#ffd84a" },
    animPal: (t) => (Math.sin(t * 7) > 0 ? { o: "#ffd84a" } : {}),
    rows: [
      ".............cc...",
      "......YyyyyY.cccC.",
      ".....YyyyyyyYc....",
      "...yyyyrrrrryyyy..",
      "..yyyyyyyyyyyyyy..",
      ".....bbbbbbbb.....",
      ".....bkobbkob.....",
      ".....bbbbbbbb.....",
      ".....bkxkxkxk.....",
      "......bbbbbb......",
      "wwwwwwwwwwwwwwwwww",
      "sRRRRRrRRRRrRRRRRs",
      "ssRRRRrRRRRrRRRRss",
      "s....RRrRRRrR....s",
      ".....RRRrRRRr.....",
      ".....RrRRRrRR.....",
      ".....xxxxxxxx.....",
      "......sswwss......",
      "........wW........",
      "........wW........",
      "........wW........",
      "........wW........",
      "........wW........",
      "........wW........",
      "........wW........",
      "......wwwWWW......",
    ],
  });

  // 8 ---------------------------------------------------------------
  addSkin("epic", {
    name: "Big Boo",
    pitch: "One enormous, friendly bedsheet ghost that fills the whole space, bobbing gently in the air with its stubby arms out.",
    pal: { w: "#f3efe6", W: "#d0c8e0", k: "#1a1024", m: "#ff8fb8" },
    float: (t) => (reduced ? 2 : 2 + Math.round((Math.sin(t * 1.8) + 1) * 1.5)),
    rows: [
      "......wwwwww......",
      "....wwwwwwwwww....",
      "...wwwwwwwwwwwwW..",
      "..wwwwwwwwwwwwwWW.",
      ".wwwwwwwwwwwwwwWW.",
      ".wwwkkkwwwwkkkwWW.",
      ".wwwkkkwwwwkkkwWW.",
      ".wwwwwwwwwwwwwwWW.",
      ".wwmmwwwkkwwwmmWW.",
      ".wwwwwwkkkkwwwwWW.",
      "wwwwwwwwkkwwwwwWWW",
      "wwwwwwwwwwwwwwwWWW",
      "ww.wwwwwwwwwwww.WW",
      "w..wwwwwwwwwwww..W",
      "...wwwwwwwwwwwwW..",
      "..wwwwwwwwwwwwwWW.",
      "..wwwwwwwwwwwwwWW.",
      "..wwwwwwwwwwwwwWW.",
      ".wwwwwwwwwwwwwwwWW",
      ".wwwwwwwwwwwwwwwWW",
      "wwwwwwwwwwwwwwwwWW",
      "ww.www.www.www.wW.",
      "w...w...w...w...w.",
    ],
  });

  // 9 ---------------------------------------------------------------
  addSkin("epic", {
    name: "Zombie Athlete",
    pitch: "A BVC player who never left the court, shambling with both arms out, torn #00 club jersey, one knee pad, one bare foot, and a volleyball tucked under an arm.",
    pal: { h: "#3a3646", z: "#8a9a72", Z: "#6a7a54", e: "#f3efe6", r: "#8f1426", k: "#1a1024", j: "#ff7a1a", J: "#c4550a", n: "#1a1024", p: "#2a2433", d: "#5a5078", w: "#e8dff5", s: "#e8dff5", S: "#a49db0", b: "#f3efe6", u: "#3d6fd1", x: "#5c0c18" },
    animPal: (t) => (Math.floor(t * 2) % 3 === 0 ? { x: "#1a1024" } : {}),
    rows: [
      "......hhhh........",
      ".....hh.hhh.......",
      ".....hzzzzZ.......",
      ".....zekzzkZ......",
      ".....zzzzzZr......",
      "......zxxxZ.......",
      ".......zZ.........",
      "....jjjjjjjJ......",
      "...zjjnjjnjJzzzzzz",
      "...zjjnjjnjJzzzzzz",
      ".bbbjnjjnjJ..zzzzz",
      "bbubbjjjjjJ.......",
      "bbbubjjj.jJ.......",
      ".bbbzppppP........",
      "......ppppP.......",
      "......pp..P.......",
      "......zz..zZ......",
      "......dd..zZ......",
      "......dd..zr......",
      "......zz..zZ......",
      "......zz..zZ......",
      "......ww..zZ......",
      "......ww..zZ......",
      ".....sss..zzz.....",
      ".....SSS..ZZZ.....",
    ],
  });

  // 10 --------------------------------------------------------------
  addSkin("epic", {
    name: "Pumpkin Golem",
    pitch: "A hulking pile of the pumpkin patch: carved pumpkin head, a giant pumpkin chest, thick twisting vine limbs and leafy hands that reach the ground.",
    pal: { o: "#ff7a1a", O: "#c4550a", r: "#e0661a", y: "#ffd84a", v: "#3f6b3a", V: "#2a4a26", l: "#5a8a3a", s: "#4a7a28" },
    animPal: (t) => ({ y: Math.sin(t * 9) + Math.sin(t * 5.1) > -0.6 ? "#fff3a0" : "#ffd84a" }),
    rows: [
      "........ss........",
      "....oooooooooo....",
      "...ooroooooroOo...",
      "..oooyyoooyyooOO..",
      "..ooyyyoooyyyoOO..",
      "..oooooyyooooOOO..",
      "..ooyoyyyyyoyoOO..",
      "...ooyyoooyyoOO...",
      ".....oooooooo.....",
      ".......vVvV.......",
      "..oooooooooooooo..",
      ".ooorooooooroooOO.",
      "vvoooroooooroooOvv",
      "vvoooroooooroooOvv",
      "vv.ooorooooroOO.vv",
      "vv..ooorooroOO..vv",
      "vv...oooooooO...vv",
      "lll...vv..vV...lll",
      "lll...vV..vV...lll",
      ".l...vV....vV...l.",
      ".....vV....vV.....",
      ".....vV....vV.....",
      "....vvV....vVV....",
      "...llvV....vVll...",
      "..llll......llll..",
    ],
  });

  // 11 --------------------------------------------------------------
  {
    const m = M(18, 25);
    oval(m, 7.5, 6, 6, 4.8, "k");
    line(m, 2, 0, 3, 3, "k"); line(m, 3, 0, 4, 3, "k"); put(m, 2, 1, "k");
    line(m, 13, 0, 12, 3, "k"); line(m, 12, 0, 11, 3, "k"); put(m, 13, 1, "k");
    put(m, 3, 2, "p"); put(m, 12, 2, "p");
    rect(m, 4, 5, 2, 2, "y"); rect(m, 9, 5, 2, 2, "y"); put(m, 5, 5, "g"); put(m, 5, 6, "g"); put(m, 10, 5, "g"); put(m, 10, 6, "g");
    put(m, 7, 8, "p"); put(m, 8, 8, "p");
    put(m, 0, 7, "w"); put(m, 1, 8, "w"); put(m, 0, 9, "w"); put(m, 15, 7, "w"); put(m, 14, 8, "w"); put(m, 15, 9, "w");
    oval(m, 7.5, 18, 7, 7, "k");
    rect(m, 0, 11, 16, 1, ".");
    oval(m, 7.5, 18, 7, 7, "k");
    rect(m, 5, 13, 6, 6, "K");
    rect(m, 3, 23, 4, 2, "K"); rect(m, 9, 23, 4, 2, "K");
    // tail up the right side, curling at the top
    line(m, 14, 23, 16, 20, "k"); line(m, 16, 20, 16, 12, "k"); line(m, 17, 12, 17, 9, "k"); put(m, 16, 8, "k"); put(m, 15, 8, "k");
    addSkin("epic", {
      name: "Black Cat",
      pitch: "A giant black cat sitting upright and filling the box, with yellow eyes that blink slowly and a tail curling up its side.",
      pal: { k: "#2e2840", K: "#3e3656", p: "#ff8fb8", y: "#ffd84a", g: "#1a1024", w: "#a99bc9" },
      animPal: (t) => (blink(t, 3.2) ? { y: "#2e2840", g: "#2e2840" } : {}),
      rows: rows(m),
    });
  }

  // 12 --------------------------------------------------------------
  addSkin("epic", {
    name: "Giant Bat",
    pitch: "A huge bat hovering with its wings spread to both edges, pointed ears, red eyes and two tiny fangs.",
    pal: { k: "#2e2840", w: "#4a3270", W: "#14101c", r: "#ff3b4d", f: "#ffffff", p: "#ff8fb8" },
    float: (t) => (reduced ? 6 : 6 + Math.round((Math.sin(t * 2.4) + 1) * 1.5)),
    rows: [
      "......k....k......",
      "......kk..kk......",
      "W.....kkkkkk.....W",
      "WW...kkrkkrkk...WW",
      "WwW.kkkkkkkkkk.WwW",
      "WwwWwkkfkkfkkwWwwW",
      "WwwwWwkkkkkkwWwwwW",
      "WwwwwWkkkkkkWwwwwW",
      "WwwwwwWkkkkWwwwwwW",
      "WwwwwwWkkkkWwwwwwW",
      "Wwww.wWkkkkWw.wwwW",
      "Www..wWkkkkWw..wwW",
      "Ww...W..kk..W...wW",
      "W....W..kk..W....W",
      "W...........W....W",
      ".......k..k.......",
    ],
  });

  // 13 --------------------------------------------------------------
  {
    const m = M(14, 27);
    for (let y = 0; y < 27; y++) {
      const w = y < 7 ? 8 + Math.round((y / 7) * 6) : 14 - Math.round(((y - 7) / 19) * 4);
      const x0 = Math.round((14 - w) / 2);
      for (let x = x0; x < x0 + w; x++) put(m, x, y, x === x0 || x === x0 + w - 1 ? "W" : y > 1 && y < 25 ? "l" : "W");
    }
    // the lid has slid open a crack: something peeks out
    line(m, 3, 8, 10, 13, "k"); line(m, 4, 8, 11, 13, "k"); line(m, 3, 9, 10, 14, "k");
    put(m, 5, 10, "e"); put(m, 7, 11, "e");
    rect(m, 6, 16, 2, 6, "c"); rect(m, 4, 18, 6, 2, "c");
    put(m, 13, 15, "z"); put(m, 13, 16, "z"); put(m, 13, 17, "z"); put(m, 12, 16, "z");
    addSkin("epic", {
      name: "Haunted Coffin",
      pitch: "You are the coffin: a tall wooden casket standing on end, its lid slid open a crack so two glowing eyes can peek out, with grey fingers curled round the edge.",
      pal: { W: "#2a1712", l: "#5a3428", k: "#07040f", e: "#ffd84a", c: "#c9a96e", z: "#8a9a72" },
      animPal: (t) => (blink(t, 2.8) ? { e: "#07040f" } : {}),
      rows: rows(m),
    });
  }

  // 14 --------------------------------------------------------------
  {
    const m = M(18, 24);
    oval(m, 8.5, 5, 6.5, 4, "g");
    put(m, 5, 4, "k"); put(m, 6, 4, "k"); put(m, 11, 4, "k"); put(m, 12, 4, "k"); put(m, 6, 3, "y"); put(m, 11, 3, "y");
    rect(m, 6, 6, 6, 1, "k"); put(m, 7, 7, "k"); put(m, 10, 7, "k");
    put(m, 3, 1, "g"); put(m, 14, 2, "g"); put(m, 9, 0, "g");
    rect(m, 0, 8, 18, 2, "r"); rect(m, 1, 8, 16, 1, "R");
    oval(m, 8.5, 13.5, 8, 6, "c");
    for (let y = 10; y < 20; y++) put(m, 4, y, "C");
    rect(m, 5, 18, 2, 1, "C");
    // chicken legs
    line(m, 5, 19, 5, 22, "o"); line(m, 12, 19, 12, 22, "o");
    rect(m, 3, 23, 4, 1, "o"); rect(m, 10, 23, 4, 1, "o");
    addSkin("epic", {
      name: "Cauldron Creature",
      pitch: "A big iron cauldron trotting around on chicken legs, its bubbling green brew bulging up into a grinning face.",
      pal: { g: "#5ee84a", y: "#ffffff", k: "#1a3a1a", r: "#3a3150", R: "#5a5078", c: "#241d33", C: "#3a3150", o: "#ffa020" },
      animPal: (t) => (Math.floor(t * 3) % 2 ? { g: "#7dff5a" } : {}),
      rows: rows(m),
    });
  }

  // 15 --------------------------------------------------------------
  {
    const m = M(18, 26);
    // handle
    for (let x = 3; x <= 14; x++) { const y = Math.round(5 - Math.sin(((x - 3) / 11) * Math.PI) * 5); put(m, x, y, "h"); }
    for (let y = 6; y < 23; y++) {
      const w = 16 - Math.round(((y - 6) / 16) * 2);
      const x0 = Math.round((18 - w) / 2);
      for (let x = x0; x < x0 + w; x++) put(m, x, y, x === x0 ? "O" : x >= x0 + w - 2 ? "O" : (x - x0) % 4 === 0 ? "r" : "o");
    }
    rect(m, 1, 6, 16, 1, "O");
    [[4, 9], [5, 9], [4, 10], [12, 9], [13, 9], [13, 10]].forEach(([x, y]) => put(m, x, y, "k"));
    rect(m, 3, 13, 12, 6, "k");
    [4, 6, 8, 10, 12, 14].forEach((x) => put(m, x, 13, "w"));
    [5, 7, 11, 13].forEach((x) => put(m, x, 18, "w"));
    rect(m, 8, 16, 3, 3, "t"); rect(m, 9, 19, 3, 3, "t"); put(m, 10, 22, "t");
    rect(m, 4, 23, 3, 3, "O"); rect(m, 11, 23, 3, 3, "O");
    put(m, 6, 2, "c"); put(m, 11, 1, "C"); put(m, 8, 3, "c");
    addSkin("epic", {
      name: "Candy Bucket Mimic",
      pitch: "A trick-or-treat pumpkin pail that turned out to be alive: jagged teeth, a long lolling tongue, stubby legs and candy spilling over the top.",
      pal: { h: "#1a1024", o: "#ff7a1a", O: "#c4550a", r: "#e0661a", k: "#1a1024", w: "#f3efe6", t: "#ff6fb5", c: "#ffd84a", C: "#c46bff" },
      animPal: (t) => (Math.floor(t * 4) % 4 === 0 ? { t: "#ff3b8a" } : {}),
      rows: rows(m),
    });
  }

  // 16 --------------------------------------------------------------
  {
    const m = M(18, 26);
    oval(m, 8.5, 3.5, 3.5, 3.5, "w");
    rect(m, 4, 8, 10, 8, "w");
    rect(m, 6, 16, 6, 3, "w");
    rect(m, 5, 18, 3, 6, "w"); rect(m, 10, 18, 3, 6, "w");
    rect(m, 4, 24, 4, 2, "w"); rect(m, 10, 24, 4, 2, "w");
    // arms out straight in front (sideways in this view)
    rect(m, 0, 9, 4, 2, "w"); rect(m, 14, 9, 4, 2, "w");
    for (let y = 0; y < 26; y++) for (let x = 0; x < 18; x++) if (m[y][x] === "w" && (x + y * 2) % 4 === 0) m[y][x] = "W";
    put(m, 7, 3, "k"); put(m, 10, 3, "e");
    // loose wraps hanging
    line(m, 14, 11, 16, 15, "w"); line(m, 3, 16, 1, 20, "W"); line(m, 12, 22, 15, 25, "w");
    addSkin("epic", {
      name: "Mummy",
      pitch: "A stiff, shuffling mummy with arms held straight out, wrapped head to toe, one glowing eye, and long loose strips of bandage dangling everywhere.",
      pal: { w: "#e0d6bc", W: "#a89c80", k: "#1a1024", e: "#5ee84a" },
      animPal: (t) => (Math.floor(t * 2) % 5 === 0 ? { e: "#e0d6bc" } : {}),
      rows: rows(m),
    });
  }

  // 17 --------------------------------------------------------------
  addSkin("epic", {
    name: "Skeleton",
    pitch: "A full skeleton with its bony arms flung up in a spooky pose, ribs, spine and hip bones all showing, and a jaw that chatters.",
    pal: { b: "#ece6d6", s: "#b9b09c", k: "#1a1024", j: "#ece6d6" },
    animPal: (t) => (Math.floor(t * 6) % 2 ? { j: "#1a1024" } : {}),
    rows: [
      "b...............b.",
      "bb.....bbbb....bb.",
      ".b....bbbbbb...b..",
      ".b....bkbbkb...b..",
      ".b....bkbbkb...b..",
      "..b...bbbkbb..b...",
      "..b....bjbj...b...",
      "...b....bb...b....",
      "...bbbbbbbbbbb....",
      "......bbbbbb......",
      ".......sbbs.......",
      "......bbbbbb......",
      ".......sbbs.......",
      "......bbbbbb......",
      "........bb........",
      "......bbbbbb......",
      ".....bb....bb.....",
      ".....b......b.....",
      ".....b......b.....",
      ".....bb....bb.....",
      ".....b......b.....",
      ".....b......b.....",
      ".....b......b.....",
      "....bbb....bbb....",
    ],
  });

  // 18 --------------------------------------------------------------
  {
    const m = M(18, 19);
    // hat
    line(m, 7, 0, 9, 5, "h"); line(m, 8, 0, 10, 5, "h"); put(m, 6, 0, "h");
    rect(m, 6, 5, 7, 1, "h"); rect(m, 4, 6, 11, 1, "h"); rect(m, 7, 5, 5, 1, "g");
    // face in profile, looking right
    rect(m, 9, 7, 3, 3, "s"); put(m, 12, 8, "s"); put(m, 11, 8, "k");
    rect(m, 6, 7, 3, 4, "a");
    // body and cape streaming back
    rect(m, 7, 10, 5, 5, "d"); rect(m, 2, 10, 5, 3, "c"); rect(m, 0, 11, 3, 3, "c"); put(m, 0, 14, "c");
    rect(m, 11, 12, 3, 1, "s");
    rect(m, 10, 15, 3, 2, "p"); put(m, 13, 16, "b"); put(m, 13, 17, "b");
    // the broom, across the whole width
    rect(m, 0, 15, 18, 1, "w");
    rect(m, 0, 14, 3, 3, "y"); put(m, 0, 17, "y"); put(m, 2, 17, "y");
    addSkin("epic", {
      name: "Witch on a Broom",
      pitch: "A witch riding sideways across the space on a broomstick, pointed hat, hair and cape streaming behind her as she floats.",
      pal: { h: "#2a1a4a", g: "#5ee84a", s: "#9ad48a", k: "#1a1024", a: "#ff7a1a", d: "#3d2470", c: "#1a1024", p: "#6b3fa8", b: "#14101c", w: "#7a4a24", y: "#d9a441" },
      float: (t) => (reduced ? 5 : 5 + Math.round((Math.sin(t * 2) + 1) * 1.5)),
      rows: rows(m),
    });
  }

  // 19 --------------------------------------------------------------
  {
    const m = M(18, 20);
    oval(m, 8.5, 5, 4.5, 4, "k");
    oval(m, 8.5, 10, 3, 2, "k");
    rect(m, 6, 3, 1, 1, "r"); rect(m, 8, 2, 1, 1, "r"); rect(m, 10, 3, 1, 1, "r"); rect(m, 7, 5, 1, 1, "r"); rect(m, 9, 5, 1, 1, "r");
    put(m, 8, 4, "m"); put(m, 9, 4, "m"); put(m, 7, 7, "x"); put(m, 8, 7, "x"); put(m, 9, 7, "x"); put(m, 10, 7, "x");
    put(m, 7, 12, "f"); put(m, 10, 12, "f");
    // eight legs, each with a knee, spread to the edges
    [[5, 6, 1, 2, 0, 19], [5, 8, 1, 6, 1, 19], [6, 10, 2, 11, 3, 19], [6, 11, 4, 14, 5, 19]].forEach(([sx, sy, kx, ky, fx, fy]) => {
      line(m, sx, sy, kx, ky, "k"); line(m, kx, ky, fx, fy, "k");
      line(m, 17 - sx, sy, 17 - kx, ky, "k"); line(m, 17 - kx, ky, 17 - fx, fy, "k");
    });
    addSkin("epic", {
      name: "Giant Spider",
      pitch: "A huge hairy spider whose eight bent legs reach the edges of the box, with a cluster of red eyes and dripping fangs.",
      pal: { k: "#4a4060", r: "#ff3b4d", m: "#ff8fb8", x: "#6b6380", f: "#f3efe6" },
      animPal: (t) => (blink(t, 2.5) ? { r: "#4a4060" } : {}),
      rows: rows(m),
    });
  }

  // 20 --------------------------------------------------------------
  {
    const m = M(18, 26);
    oval(m, 8.5, 5, 6.5, 5, "s");
    rect(m, 2, 5, 14, 15, "s");
    for (let y = 0; y < 20; y++) for (let x = 0; x < 18; x++) if (m[y][x] === "s" && x >= 14) m[y][x] = "S";
    // RIP
    [[5, 5], [5, 6], [5, 7], [5, 8], [6, 5], [7, 6], [6, 7], [7, 8], [9, 5], [9, 6], [9, 7], [9, 8], [11, 5], [11, 6], [11, 7], [11, 8], [12, 5], [12, 6]].forEach(([x, y]) => put(m, x, y, "k"));
    line(m, 9, 11, 7, 14, "k"); line(m, 7, 14, 8, 17, "k");
    put(m, 4, 12, "m"); put(m, 5, 13, "m"); put(m, 12, 15, "m");
    rect(m, 0, 20, 18, 1, "d"); rect(m, 1, 19, 2, 1, "d");
    rect(m, 4, 21, 3, 3, "l"); rect(m, 11, 21, 3, 3, "l"); rect(m, 3, 24, 4, 2, "l"); rect(m, 11, 24, 4, 2, "l");
    // a zombie hand reaching out of the side
    rect(m, 16, 10, 2, 1, "z"); put(m, 17, 9, "z"); put(m, 17, 8, "z"); put(m, 16, 8, "z"); put(m, 15, 8, "z");
    addSkin("epic", {
      name: "Walking Tombstone",
      pitch: "A cracked, mossy RIP gravestone stomping around on stubby stone legs, clumps of dirt clinging to its base and a zombie hand reaching out of its side.",
      pal: { s: "#8a8494", S: "#65606e", k: "#3a3646", m: "#5a8a3a", d: "#4a3018", l: "#65606e", z: "#8a9a72" },
      animPal: (t) => (Math.floor(t * 2) % 2 ? { z: "#9aaa82" } : {}),
      rows: rows(m),
    });
  }
})();
