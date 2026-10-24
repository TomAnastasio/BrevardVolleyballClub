// Format sample only (not part of the gallery). One theme per slot.
addTheme("head", {
  name: "Sample Cap",
  pitch: "Format check.",
  common: {
    pitch: "A plain cap.",
    colors: [{ name: "Red", base: "#c42a3e" }, { name: "Blue", base: "#2a4a8f" }, { name: "Green", base: "#2f6b3a" }, { name: "Black", base: "#231d33" }, { name: "Orange", base: "#ff7a1a" }, { name: "White", base: "#e8e0d0" }],
    make: (col) => ({ build() { const g = makeGrid(); g.row(4, 10, 0, col.base); g.row(4, 12, 1, darken(col.base)); outline(g); return g; } }),
  },
  rare: { name: "Star Cap", pitch: "With a star.", item: { build() { const g = makeGrid(); g.row(4, 10, 0, "#2a4a8f"); g.row(4, 12, 1, "#1c3366"); outline(g); g.set(7, 0, "#ffd84a"); return g; } } },
  epic: { name: "Blink Cap", pitch: "Star blinks.", item: { build(t) { const g = makeGrid(); g.row(4, 10, 0, "#2a4a8f"); g.row(4, 12, 1, "#1c3366"); outline(g); g.set(7, 0, Math.sin(t * 6) > 0 ? "#fff" : "#ffd84a"); return g; } } },
  legendary: { name: "Glow Cap", pitch: "Glows.", item: { under: (c, l, tp, t) => glow(c, l + 7, tp, 10, "#ffd84a", 0.4), build() { const g = makeGrid(); g.row(4, 10, 0, "#ffc53a"); g.row(4, 12, 1, "#b36a00"); outline(g); return g; } } },
});
addTheme("shirt", {
  name: "Sample Tee", pitch: "Format check.",
  common: { pitch: "Plain tee.", colors: [{ name: "Red", c: "#c42a3e" }, { name: "Blue", c: "#2a4a8f" }, { name: "Green", c: "#2f6b3a" }, { name: "Black", c: "#231d33" }, { name: "Orange", c: "#ff7a1a" }, { name: "White", c: "#e8e0d0" }], make: (col) => ({ sleeve: "short", px: (x, y, z) => (z === "T" ? darken(col.c, 0.8) : col.c) }) },
  rare: { name: "R", pitch: ".", item: { sleeve: "long", px: () => "#6b3fa8" } },
  epic: { name: "E", pitch: ".", item: { sleeve: "short", px: (x, y, z, t) => (Math.sin(t * 4 + y) > 0 ? "#c46bff" : "#6b3fa8") } },
  legendary: { name: "L", pitch: ".", item: { sleeve: "short", px: () => "#ffc53a", over: (c, l, tp, t) => sparkle(c, l + 7, tp + 10, "#fff", Math.sin(t * 5) > 0) } },
});
addTheme("pants", {
  name: "Sample Pants", pitch: "Format check.",
  common: { pitch: "Plain.", colors: [{ name: "a", c: "#c42a3e" }, { name: "b", c: "#2a4a8f" }, { name: "c", c: "#2f6b3a" }, { name: "d", c: "#231d33" }, { name: "e", c: "#ff7a1a" }, { name: "f", c: "#e8e0d0" }], make: (col) => ({ long: true, px: () => col.c }) },
  rare: { name: "R", pitch: ".", item: { long: false, px: () => "#6b3fa8" } },
  epic: { name: "E", pitch: ".", item: { long: true, socks: true, px: (x, y, z, t) => (Math.sin(t * 4 + y) > 0 ? "#c46bff" : "#6b3fa8") } },
  legendary: { name: "L", pitch: ".", item: { ghost: true, px: () => null, over: (c, l, tp) => R(c, l + 5, tp + 15, 5, 10, "#f3efe6") } },
});
addTheme("shoes", {
  name: "Sample Shoes", pitch: "Format check.",
  common: { pitch: "Plain.", colors: [{ name: "a", c: "#c42a3e" }, { name: "b", c: "#2a4a8f" }, { name: "c", c: "#2f6b3a" }, { name: "d", c: "#231d33" }, { name: "e", c: "#ff7a1a" }, { name: "f", c: "#e8e0d0" }], make: (col) => ({ px: (x, y) => (y === 26 ? darken(col.c) : col.c) }) },
  rare: { name: "R", pitch: ".", item: { high: true, px: () => "#6b3fa8" } },
  epic: { name: "E", pitch: ".", item: { px: (x, y, z, t) => (Math.sin(t * 4 + x) > 0 ? "#c46bff" : "#6b3fa8") } },
  legendary: { name: "L", pitch: ".", item: { lift: 2, px: () => "#ffc53a", under: (c, l, g, t) => glow(c, l + 7, g + 27, 8, "#ffc53a", 0.5) } },
});
