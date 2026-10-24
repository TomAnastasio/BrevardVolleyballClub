// usage (from /workspace copy): node .x.mjs PAGE.html OUT_PREFIX [tier] [from] [to]
import { chromium } from '/workspace/node_modules/playwright/index.mjs';
const [page, prefix, tier, from = 1, to = 99] = process.argv.slice(2);
const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: 1180, height: 900 } });
const errs = [];
pg.on('pageerror', (e) => errs.push(e.message));
pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('file://' + page);
await pg.waitForTimeout(500);
const grid = await pg.$(tier ? `#${tier} .xgrid` : '.xgrid');
const n = await pg.evaluate((sel) => document.querySelectorAll(sel).length, tier ? `#${tier} .xcard` : '.xcard');
// screenshot the grid in chunks of 8 cards
const cards = await pg.$$(tier ? `#${tier} .xcard` : '.xcard');
let shot = 0;
for (let i = Number(from) - 1; i < Math.min(cards.length, Number(to)); i += 8) {
  await cards[i].scrollIntoViewIfNeeded(); await pg.waitForTimeout(900);
  const boxes = []; for (let k = i; k < Math.min(i + 8, cards.length, Number(to)); k++) boxes.push(await cards[k].boundingBox());
  const x0 = Math.min(...boxes.map((b) => b.x)), y0 = Math.min(...boxes.map((b) => b.y)), x1 = Math.max(...boxes.map((b) => b.x + b.width)), y1 = Math.max(...boxes.map((b) => b.y + b.height));
  await pg.setViewportSize({ width: 1180, height: Math.ceil(y1 - y0 + 40) });
  await cards[i].scrollIntoViewIfNeeded(); await pg.waitForTimeout(700);
  const bb = await cards[i].boundingBox();
  await pg.screenshot({ path: `${prefix}-${++shot}.png`, clip: { x: x0, y: bb.y, width: x1 - x0, height: y1 - y0 } });
  await pg.setViewportSize({ width: 1180, height: 900 });
}
await pg.setViewportSize({ width: 400, height: 800 });
console.log(JSON.stringify({ cards: n, errors: errs, phone: await pg.evaluate(() => document.documentElement.scrollWidth) }));
await b.close();
