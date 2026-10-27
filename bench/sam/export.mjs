// Export the SAM spike dataset (no model calls): the BUGGY page screenshot for every seeded bug + ground-truth boxes of the affected elements.
//   node bench/sam/export.mjs   ->  param/sam_spike/data/{id}.png and manifest.json
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { bugs } from '../seeded/bugs.mjs';
import { loadPage, copyApp, applyMutation } from '../seeded/lib.mjs';

const prompts = JSON.parse(fs.readFileSync('bench/sam/prompts.json', 'utf8'));
const out = 'param/sam_spike/data'; fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const manifest = [];
for (const bug of bugs) {
  const work = path.join('bench/_work/sam-export', bug.id);
  await copyApp('bench/seeded/app', work); await applyMutation(work, bug.mutate);
  const page = await loadPage(browser, work, bug);
  if (bug.id.includes('hover')) await page.hover('#tab2', { timeout: 1500 }).catch(() => {});
  const boxes = await page.evaluate((sels) => sels.flatMap((s) => [...document.querySelectorAll(s)].map((e) => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom].map((v) => Math.round(v * 10) / 10); })).filter((b) => b[2] > b[0] && b[3] > b[1]), bug.target);
  const vp = page.viewportSize();
  await page.screenshot({ path: path.join(out, bug.id + '.png') });
  await page.close();
  manifest.push({ id: bug.id, cls: bug.cls, phrase: prompts[bug.id], gt_boxes: boxes, width: vp.width, height: vp.height });
}
await browser.close();
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 1));
console.log(`exported ${manifest.length} screenshots; ${manifest.filter((m) => !m.gt_boxes.length).length} with no visible GT box`);
