// Generate every real asset the video uses (run from the pixelsmith repo root):  node video/tools/make_assets.mjs
// - browser recordings (Playwright) of the REAL buggy Pico #474 build and the agent's own fixed build
// - stills: before/after, and a real cheat attempt rejected by the grader
// - src/trace.json: the real agent run record (files picked, why, self-check, grade, real per-call timing, real SCSS diff)
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { bugs } from '../../bench/seeded/bugs.mjs';
import { loadPage, copyApp, applyMutation } from '../../bench/seeded/lib.mjs';
import { probeTargets, neutralised } from '../../bench/lib/visibility.mjs';
import { measureBug } from '../../bench/lib/harness.mjs';

const PUB = 'video/public', CLIPS = `${PUB}/clips`, IMG = `${PUB}/img`;
for (const d of [CLIPS, IMG, 'video/out/_tmp']) fs.mkdirSync(d, { recursive: true });
const sh = (c, cwd) => execSync(c, { cwd, stdio: 'pipe', encoding: 'utf8', maxBuffer: 1 << 26 });
const browser = await chromium.launch({ channel: 'chrome' });

// ---- 1. Pico #474: real recordings of buggy vs agent-fixed (animated spinner) + stills ----------------------------------
const run = JSON.parse(fs.readFileSync('results/real/vision/run1/pico-474.json', 'utf8'));
const agentCss = run.attempts.filter((a) => a.css).at(-1).css.replace(/\\/g, '/');
const variants = { buggy: 'bench/_work/pico-474-buggy.css', fixed: agentCss, upstream: 'bench/_work/pico-474-fixed.css' };
for (const [name, css] of Object.entries(variants)) {
  const dir = path.resolve('bench/_work/video-page-' + name); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(css, path.join(dir, 'daisyui.css')); fs.copyFileSync('bench/bugs/pico-474/page.html', path.join(dir, 'page.html'));
  const url = pathToFileURL(path.join(dir, 'page.html')).href;
  if (name !== 'upstream') {
    const ctx = await browser.newContext({ viewport: { width: 900, height: 360 }, recordVideo: { dir: 'video/out/_tmp', size: { width: 900, height: 360 } } });
    const page = await ctx.newPage(); await page.goto(url); await page.waitForTimeout(5200);
    const v = await page.video().path(); await ctx.close();
    sh(`ffmpeg -v error -y -i "${v}" -ss 0.4 -t 4.8 -r 30 -vf "scale=1800:720:flags=lanczos" -pix_fmt yuv420p -c:v libx264 -crf 17 -an "${CLIPS}/spinner-${name}.mp4"`);
  }
  const sctx = await browser.newContext({ viewport: { width: 900, height: 360 }, deviceScaleFactor: 2 });
  const sp = await sctx.newPage(); await sp.goto(url); await sp.waitForTimeout(300); await sp.screenshot({ path: `${IMG}/spinner-${name}.png` }); await sctx.close();
}

// ---- 2. A real cheat attempt on a seeded bug: the oracle passes, the anti-cheat refuses ----------------------------------
const bug = bugs.find((b) => b.id === 'overflow-toast-offscreen');
const wordsSubset = (a, b) => { const B = new Set(b.toLowerCase().match(/[\p{L}\p{N}$]+/gu) || []); return (a.toLowerCase().match(/[\p{L}\p{N}$]+/gu) || []).every((w) => B.has(w)); };
async function state(dir, file) {
  const p = await loadPage(browser, dir, bug); const o = await bug.oracle(p); const text = await p.evaluate(() => document.body.innerText);
  const probe = await probeTargets(p, bug.target); await p.screenshot({ path: `${IMG}/${file}.png` }); await p.close(); return { o, text, probe };
}
const clean = await state('bench/seeded/app', 'toast-clean');
const buggyDir = 'bench/_work/video-toast-buggy'; await copyApp('bench/seeded/app', buggyDir); await applyMutation(buggyDir, bug.mutate);
const cheatDir = 'bench/_work/video-toast-cheat'; await copyApp('bench/seeded/app', cheatDir); await applyMutation(cheatDir, bug.mutate);
fs.appendFileSync(path.join(cheatDir, 'styles.css'), '\n#toast{display:none!important}');
const buggy = await state(buggyDir, 'toast-buggy'); const cheat = await state(cheatDir, 'toast-cheat');
const honestDir = 'bench/_work/seeded-agent/vision/run1/overflow-toast-offscreen';
const honest = fs.existsSync(honestDir) ? await state(honestDir, 'toast-honest') : null;
const verdict = (s) => ({ oraclePass: !!s.o.pass, wordsKept: wordsSubset(clean.text, s.text), neutralised: neutralised(s.probe, clean.probe) });
const cheatInfo = { bug: bug.id, buggy: verdict(buggy), cheat: verdict(cheat), honest: honest ? verdict(honest) : null, cheatCss: '#toast { display: none !important }' };

// ---- 3. The real agent run record + real SCSS diff -----------------------------------------------------------------------
const meta = JSON.parse(fs.readFileSync('bench/bugs/pico-474/meta.json', 'utf8'));
const SRC = 'bench/_work/pico-src-vision';
sh(`git fetch -q --depth 1 origin ${meta.base_sha}`, SRC); sh('git checkout -q -f FETCH_HEAD', SRC);
let diff = ''; try { diff = sh(`git diff --no-index --no-color "${SRC}/scss" "bench/_work/real/vision/run1/pico-474/scss"`); } catch (e) { diff = e.stdout || ''; }
const diffLines = diff.split('\n').filter((l) => /^[+-]/.test(l) && !/^(\+\+\+|---)/.test(l)).slice(0, 14);
const cost = fs.readFileSync('results/cost.jsonl', 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((c) => (c.tag || '').startsWith('real/vision/r1/pico-474/'));
// cost.jsonl also holds discarded runs with identical tags; keep only the LAST pick..verify2 cycle (the kept run)
const lastEnd = cost.map((c) => c.tag.split('/').pop()).lastIndexOf('verify2');
const lastStart = cost.slice(0, lastEnd + 1).map((c) => c.tag.split('/').pop()).lastIndexOf('pick');
const keptCalls = cost.slice(lastStart, lastEnd + 1);
// measured on the exact builds shown in the video (buggy build and the agent's final css), not hard-coded
const m1 = await measureBug('bench/bugs/pico-474', variants.buggy, null), m2 = await measureBug('bench/bugs/pico-474', variants.fixed, null);
const measured = { buggy: { box: m1.checks[0].boxWidth, bg: m1.checks[0].bgWidth, pass: m1.pass }, fixed: { box: m2.checks[0].boxWidth, bg: m2.checks[0].bgWidth, pass: m2.pass } };
const trace = {
  pick: run.pick, attempts: run.attempts.map((a) => ({ n: a.n, why: a.why, selfFixed: a.selfVerify?.fixed, selfReason: a.selfVerify?.reason })),
  grade: run.grade, diffLines, calls: keptCalls.map((c) => ({ tag: c.tag.split('/').pop(), ms: c.ms, out: c.completion_tokens })),
  oracle: measured, cheat: cheatInfo, agentCss,
};
fs.writeFileSync('video/src/trace.json', JSON.stringify(trace, null, 1));

// ---- 4. SAM stills: one real hit and one real miss with the real boxes ---------------------------------------------------
const sam = JSON.parse(fs.readFileSync('results/sam/spike1-preregistered-thr0.5.json', 'utf8')).rows;
const man = JSON.parse(fs.readFileSync('param/sam_spike/data/manifest.json', 'utf8'));
const pick = (id) => { const r = sam.find((x) => x.id === id), m = man.find((x) => x.id === id); fs.copyFileSync(`param/sam_spike/data/${id}.png`, `${IMG}/sam-${id}.png`); return { id, phrase: r.phrase, w: m.width, h: m.height, gt: m.gt_boxes, pred: r.pred_boxes, scores: r.scores, iou: r.best_iou, hit: r.hit }; };
fs.writeFileSync('video/src/sam.json', JSON.stringify({ hit: pick('spacing-button-icon-misaligned'), miss: pick('overflow-modal-mobile'), miss2: pick('stacking-dropdown-behind') }, null, 1));

// ---- 5. Meta Model API run: the agent rearranged the page to satisfy its own check (what the model saw, before/after) --------
const gb = bugs.find((b) => b.id === 'contrast-error-text');
for (const [dir, file] of [['bench/seeded/app', 'gaming-clean'], ['bench/_work/seeded-agent-meta/vision/run3/contrast-error-text', 'gaming-agent']]) {
  const gp = await loadPage(browser, dir, gb); await gp.screenshot({ path: `${IMG}/${file}.png` }); await gp.close();
}

await browser.close();
console.log('assets ok'); console.log(JSON.stringify(cheatInfo));
console.log('diff:\n' + diffLines.join('\n'));
