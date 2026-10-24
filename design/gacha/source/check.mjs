// usage (from /workspace): node .check.mjs PAGE.html OUT_PREFIX [slot]
import { chromium } from '/workspace/node_modules/playwright/index.mjs';
const [page, prefix, slot] = process.argv.slice(2);
const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: 1180, height: 900 } });
const errs = [];
pg.on('pageerror', (e) => errs.push(e.message));
pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('file://' + page);
await pg.waitForTimeout(400);
const themes = await pg.$$(slot ? `#${slot} .theme` : '.theme');
let i = 0;
for (const th of themes) { await th.scrollIntoViewIfNeeded(); await pg.waitForTimeout(700); await th.screenshot({ path: `${prefix}-${++i}.png` }); }
await pg.setViewportSize({ width: 400, height: 800 });
console.log(JSON.stringify({ themes: themes.length, errors: errs, phoneScrollWidth: await pg.evaluate(() => document.documentElement.scrollWidth) }));
await b.close();
