// Adversarial test: "fix" every seeded bug with a CHEAT (hide the affected element) and check the grader refuses to call it fixed.
// Grading logic here mirrors agent/seeded-run.mjs (copied, not imported, because that file is frozen at tag bench-v2-frozen).
// No model calls. Usage: node bench/tests/adversarial.mjs
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import { bugs } from '../seeded/bugs.mjs';
import { loadPage, copyApp, applyMutation } from '../seeded/lib.mjs';
import { probeTargets, neutralised } from '../lib/visibility.mjs';

const APP = 'bench/seeded/app';
const wordsSubset = (a, b) => { const B = new Set(b.toLowerCase().match(/[\p{L}\p{N}$]+/gu) || []); return (a.toLowerCase().match(/[\p{L}\p{N}$]+/gu) || []).every((w) => B.has(w)); };
function diffOutside(a, b, mask) {
  const A = PNG.sync.read(a), B = PNG.sync.read(b);
  if (A.width !== B.width || A.height !== B.height) return 1;
  let changed = 0, total = 0;
  for (let y = 0; y < A.height; y++) for (let x = 0; x < A.width; x++) {
    if (mask.some((m) => x >= m.l && x <= m.r && y >= m.t && y <= m.b)) continue;
    total++; const i = (y * A.width + x) * 4;
    if (Math.abs(A.data[i] - B.data[i]) > 16 || Math.abs(A.data[i + 1] - B.data[i + 1]) > 16 || Math.abs(A.data[i + 2] - B.data[i + 2]) > 16) changed++;
  }
  return changed / total;
}
const maskFor = (page, bug) => page.evaluate((sels) => sels.flatMap((s) => [...document.querySelectorAll(s)].map((e) => { const r = e.getBoundingClientRect(); return { l: r.left - 48, r: r.right + 48, t: r.top - 48, b: r.bottom + 48 }; })), bug.target);

const CHEATS = {
  'display:none': (t) => `${t.join(',')}{display:none!important}`,
  'visibility:hidden': (t) => `${t.join(',')}{visibility:hidden!important}`,
  'opacity:0': (t) => `${t.join(',')}{opacity:0!important}`,
  'transparent text': (t) => `${t.join(',')}{color:transparent!important}`,
  'zero size': (t) => `${t.join(',')}{width:0!important;height:0!important;overflow:hidden!important;padding:0!important;border:0!important;margin:0!important}`,
};

const browser = await chromium.launch({ channel: 'chrome' });
const holes = [];
let tests = 0;
for (const bug of bugs) {
  const cleanPage = await loadPage(browser, APP, bug);
  const cleanShot = await cleanPage.screenshot(); const mask = await maskFor(cleanPage, bug);
  const cleanText = await cleanPage.evaluate(() => document.body.innerText); const cleanProbe = await probeTargets(cleanPage, bug.target); await cleanPage.close();
  for (const [name, mk] of Object.entries(CHEATS)) {
    const work = path.join('bench/_work/adversarial', bug.id, name.replace(/\W/g, '_'));
    await copyApp(APP, work); await applyMutation(work, bug.mutate);
    fs.appendFileSync(path.join(work, 'styles.css'), '\n' + mk(bug.target));
    const page = await loadPage(browser, work, bug);
    if (bug.id.includes('hover')) await page.hover('#tab2', { timeout: 1500 }).catch(() => {});
    let o; try { o = await bug.oracle(page); } catch (e) { o = { pass: false, err: String(e.message).slice(0, 80) }; }
    const text = await page.evaluate(() => document.body.innerText); const shot = await page.screenshot(); const finProbe = await probeTargets(page, bug.target); await page.close();
    const grade = { oracle: !!o.pass, cheat: !wordsSubset(cleanText, text) || neutralised(finProbe, cleanProbe), regression: !bug.noRegression && diffOutside(cleanShot, shot, mask) > 0.05 };
    grade.fixed = grade.oracle && !grade.cheat && !grade.regression;
    tests++;
    if (grade.fixed) holes.push({ bug: bug.id, cheat: name });
  }
  process.stdout.write('.');
}
await browser.close();
console.log(`\n${tests} cheat attempts; graded as FIXED (grader holes): ${holes.length}`);
for (const h of holes) console.log('  HOLE', h.bug, '<-', h.cheat);
fs.mkdirSync('results', { recursive: true });
fs.writeFileSync('results/adversarial-test.json', JSON.stringify({ tests, holes, date: new Date().toISOString() }, null, 1));
