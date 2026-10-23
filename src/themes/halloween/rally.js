// Halloween art for the home screen's rally (VolleyballRally.jsx): pixel
// skeletons instead of stick figures, a pumpkin instead of the ball, and a
// cobwebby net on bone posts. Only the drawing changes; every position,
// timing and motion still comes from VolleyballRally, which passes in the
// same numbers its classic drawing uses.
const BONE = "#ece6d6";
const BONE_SHADE = "#b9b09c";
const SOCKET = "#1a1024";
const GLOW = "#ff7a1a";
const PUMPKIN = "#ff7a1a";
const PUMPKIN_RIB = "#c4550a";
const FACE = "#ffd84a";
const STEM = "#4a7a28";
const WEB = "rgba(225,215,255,0.32)";

// Pixel maps: each character is one pixel ("." = see-through).
const SKELETON_BODY = [
  "....b....",
  "bbbbbbbbb",
  "b.bbbbb.b",
  "b.b.b.b.b",
  "b.bbbbb.b",
  "b.b.b.b.b",
  "b..bbb..b",
  "s...b...s",
  "..bbbbb..",
  "..b...b..",
  "..b...b..",
  "..s...s..",
  "..b...b..",
  "..b...b..",
  ".bb...bb.",
];
const SKULL = [".bbbbb.", "bbbbbbb", "bkkbkkb", "bkgbkgb", "bbbkbbb", ".btbtb.", "..bbb.."];
const PUMPKIN_ART = ["...v...", ".oooro.", "oyoroyo", "rooooor", "oyyyyyo", ".ooroo."];
const PALETTE = { b: BONE, s: BONE_SHADE, k: SOCKET, g: GLOW, t: SOCKET, o: PUMPKIN, r: PUMPKIN_RIB, y: FACE, v: STEM };

// Draws a pixel map with its centre at (0, 0) of the current transform,
// stretched to w x h.
function drawPixels(ctx, rows, w, h, palette = PALETTE) {
  const cols = rows[0].length;
  const pw = w / cols;
  const ph = h / rows.length;
  rows.forEach((row, j) => {
    for (let i = 0; i < cols; i++) {
      const color = palette[row[i]];
      if (!color) continue;
      ctx.fillStyle = color;
      // +0.02 closes hairline seams between scaled pixels
      ctx.fillRect(-w / 2 + i * pw, -h / 2 + j * ph, pw + 0.02, ph + 0.02);
    }
  });
}

// Same arguments and the same body/head boxes as the classic drawPlayer, so
// the skeleton stands, hops, squashes and falls exactly where the stick
// figure would. Falling over is drawn as a rotation of the standing pose.
export function drawSkeleton(ctx, { x, groundY, squash, hop, lie = 0, fallDir = 1 }) {
  const bodyW = 9;
  const bodyH = 15;
  const headSize = 7;
  const w = bodyW * (1 + squash * 0.35);
  const h = bodyH * (1 - squash * 0.35);
  const angle = fallDir * lie * (Math.PI / 2);

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  // pivot on the feet, rising as it tips so the fallen skeleton lies on the
  // ground instead of half through it
  ctx.translate(x + fallDir * lie * 2, groundY - hop - (lie * w) / 2);
  ctx.rotate(angle);
  ctx.save();
  ctx.translate(0, -h / 2);
  drawPixels(ctx, SKELETON_BODY, w, h);
  ctx.restore();

  // Always a skull, even for a signed-in player's photo head (owner's call):
  // photo heads come back with the classic look.
  ctx.translate(0, -h - headSize / 2);
  drawPixels(ctx, SKULL, headSize, headSize);
  ctx.restore();
}

// The pumpkin, a touch bigger than the ball so its face reads. `squashX` and
// `squashY` are the classic ball's stretch at contact.
export function drawPumpkin(ctx, x, y, squashX = 1, squashY = 1) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(x, y);
  drawPixels(ctx, PUMPKIN_ART, 8 * squashX, 7 * squashY);
  ctx.restore();
}

// Same net outline as the classic one (same corners), dressed up: sagging
// cobweb strands, a web in the top corner, an orange top cord, bone posts
// and a little spider hanging off the cord.
export function drawSpookyCourt(ctx, { width, groundY, netHeight, netSkew }) {
  const lerp = (a, b, t) => a + (b - a) * t;
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, groundY + 0.5);
  ctx.lineTo(width, groundY + 0.5);
  ctx.stroke();

  const netCenterX = width / 2;
  const leftPostX = netCenterX - netSkew;
  const rightPostX = netCenterX + netSkew;
  const leftTopY = groundY - netHeight;
  const rightTopY = groundY - netHeight - 10;
  const rightBottomY = groundY - 4;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(leftPostX, leftTopY);
  ctx.lineTo(rightPostX, rightTopY);
  ctx.lineTo(rightPostX, rightBottomY);
  ctx.lineTo(leftPostX, groundY);
  ctx.closePath();
  ctx.fillStyle = "rgba(155,77,255,0.08)";
  ctx.fill();
  ctx.clip();
  ctx.strokeStyle = WEB;
  // sagging horizontal strands
  const rows = 4;
  for (let row = 1; row < rows; row++) {
    const t = row / rows;
    const y1 = lerp(leftTopY, groundY, t);
    const y2 = lerp(rightTopY, rightBottomY, t);
    ctx.beginPath();
    ctx.moveTo(leftPostX, y1);
    ctx.quadraticCurveTo(netCenterX, (y1 + y2) / 2 + 2.5, rightPostX, y2);
    ctx.stroke();
  }
  const cols = 5;
  for (let col = 1; col < cols; col++) {
    const t = col / cols;
    ctx.beginPath();
    ctx.moveTo(lerp(leftPostX, rightPostX, t), lerp(leftTopY, rightTopY, t));
    ctx.lineTo(lerp(leftPostX, rightPostX, t), lerp(groundY, rightBottomY, t));
    ctx.stroke();
  }
  // a little web fanning out of the top-left corner
  ctx.strokeStyle = "rgba(240,235,255,0.5)";
  for (const r of [5, 9]) {
    ctx.beginPath();
    ctx.arc(leftPostX, leftTopY, r, -0.1, Math.PI / 2 - 0.2);
    ctx.stroke();
  }
  for (let a = 0; a <= 3; a++) {
    const ang = -0.1 + (a / 3) * (Math.PI / 2 - 0.1);
    ctx.beginPath();
    ctx.moveTo(leftPostX, leftTopY);
    ctx.lineTo(leftPostX + Math.cos(ang) * 11, leftTopY + Math.sin(ang) * 11);
    ctx.stroke();
  }
  ctx.restore();

  // orange top cord
  ctx.strokeStyle = GLOW;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(leftPostX, leftTopY);
  ctx.lineTo(rightPostX, rightTopY);
  ctx.stroke();

  // bone posts with knobbly ends
  ctx.fillStyle = BONE;
  ctx.fillRect(leftPostX - 1, leftTopY, 2, groundY - leftTopY);
  ctx.fillRect(rightPostX - 1, rightTopY, 2, rightBottomY - rightTopY);
  for (const [px, py] of [
    [leftPostX, leftTopY],
    [rightPostX, rightTopY],
  ]) {
    ctx.fillRect(px - 2, py - 2, 2, 2);
    ctx.fillRect(px, py - 2, 2, 2);
  }

  // spider dangling from the middle of the cord
  const sx = Math.round(lerp(leftPostX, rightPostX, 0.62));
  const sTop = lerp(leftTopY, rightTopY, 0.62);
  ctx.fillStyle = "rgba(240,235,255,0.6)";
  ctx.fillRect(sx, sTop, 1, 6);
  ctx.fillStyle = SOCKET;
  ctx.fillRect(sx - 1, sTop + 6, 3, 3);
  ctx.fillRect(sx - 2, sTop + 6, 1, 1);
  ctx.fillRect(sx + 2, sTop + 6, 1, 1);
  ctx.fillRect(sx - 2, sTop + 8, 1, 1);
  ctx.fillRect(sx + 2, sTop + 8, 1, 1);
  ctx.fillStyle = "#ff2a3a";
  ctx.fillRect(sx, sTop + 7, 1, 1);
}
