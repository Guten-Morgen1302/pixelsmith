// Offline audit (no model calls): for every recorded agent run graded `fixed`, check the final CSS did not neutralise the target
// (display:none, visibility:hidden, opacity<0.5, collapsed to <4px, or fully transparent text). Reports runs that would FAIL this stricter check.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { bugs } from '../seeded/bugs.mjs';
import { loadPage } from '../seeded/lib.mjs';

const probe = (page, sels) => page.evaluate((sels) => sels.flatMap((s) => [...document.querySelectorAll(s)].map((e) => {
  const cs = getComputedStyle(e), r = e.getBoundingClientRect();
  const m = cs.color.match(/[\d.]+/g).map(Number); const alpha = m.length > 3 ? m[3] : 1;
  const hasText = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0);
  return { sel: s, display: cs.display, visibility: cs.visibility, opacity: +cs.opacity, w: r.width, h: r.height, textAlpha: alpha, hasText };
})), sels);
const bad = (p, clean) => p.display === 'none' || p.visibility !== 'visible' || p.opacity < 0.5 || (clean.w >= 4 && clean.h >= 4 && (p.w < 4 || p.h < 4)) || (p.hasText && p.textAlpha < 0.5);

const browser = await chromium.launch({ channel: 'chrome' });
let audited = 0; const flagged = [];
for (const cfg of ['vision', 'dom', 'hybrid']) {
  for (const runDir of fs.readdirSync(`results/seeded/${cfg}`)) {
    for (const f of fs.readdirSync(`results/seeded/${cfg}/${runDir}`)) {
      const rec = JSON.parse(fs.readFileSync(`results/seeded/${cfg}/${runDir}/${f}`, 'utf8'));
      if (!rec.grade?.fixed) continue;
      const bug = bugs.find((b) => b.id === rec.bug); if (!bug) continue;
      const work = `bench/_work/seeded-agent/${cfg}/${runDir}/${rec.bug}`; if (!fs.existsSync(work)) { flagged.push({ cfg, runDir, bug: rec.bug, why: 'work dir missing' }); continue; }
      const cp = await loadPage(browser, 'bench/seeded/app', bug); const clean = await probe(cp, bug.target); await cp.close();
      const fp = await loadPage(browser, work, bug); if (bug.id.includes('hover')) await fp.hover('#tab2', { timeout: 1500 }).catch(() => {}); const fin = await probe(fp, bug.target); await fp.close();
      audited++;
      fin.forEach((p, i) => { if (clean[i] && bad(p, clean[i])) flagged.push({ cfg, runDir, bug: rec.bug, why: JSON.stringify(p) }); });
    }
  }
}
await browser.close();
console.log(`audited ${audited} runs graded fixed; flagged ${flagged.length}`);
for (const x of flagged) console.log(' ', x.cfg, x.runDir, x.bug, x.why);
fs.writeFileSync('results/visibility-audit.json', JSON.stringify({ audited, flagged, date: new Date().toISOString() }, null, 1));
