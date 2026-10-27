// Render each README chart SVG to a PNG (video/out/qa2) so it can be eyeballed. Run from repo root.
import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
fs.mkdirSync('video/out/qa2', { recursive: true });
const b = await chromium.launch({ channel: 'chrome' });
for (const n of ['results', 'selfcheck', 'sam']) {
  const p = await b.newPage({ viewport: { width: 900, height: 760 } });
  // inline the SVG in an HTML page: screenshotting a bare .svg document hangs in headless Chrome
  await p.setContent(`<body style="margin:0;background:#fff">${fs.readFileSync(`docs/media/chart-${n}.svg`, 'utf8')}</body>`);
  await p.locator('svg').screenshot({ path: `video/out/qa2/chart-${n}.png` });
  await p.close();
}
await b.close();
console.log('ok');
