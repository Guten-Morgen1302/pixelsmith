// Run the Pixelsmith reference agent over the seeded bench under one config.
//   node agent/seeded-run.mjs <vision|dom|hybrid> [--runs N] [--split dev|heldout|all] [--only id,id] [--conc N]
// The oracle and the clean reference are NEVER shown to the model. Grading: oracle pass + anti-cheat (innerText equals clean)
// + regression (pixels changed outside the bug's target region vs. the clean render).
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import { bugs } from '../bench/seeded/bugs.mjs';
import { loadPage, copyApp, applyMutation } from '../bench/seeded/lib.mjs';
import { chat, imageMessage } from './llm.mjs';
import { probeTargets, neutralised } from '../bench/lib/visibility.mjs';

const args = process.argv.slice(2);
const config = args[0];
if (!['vision', 'dom', 'hybrid'].includes(config)) throw new Error('config must be vision|dom|hybrid');
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const RUNS = +opt('runs', 1), SPLIT = opt('split', 'dev'), ONLY = opt('only', ''), CONC = +opt('conc', 4), MAX_ATTEMPTS = +opt('attempts', 2);
const APP = 'bench/seeded/app';
const splits = JSON.parse(fs.readFileSync('bench/seeded/splits.json', 'utf8'));
const chosen = bugs.filter((b) => (ONLY ? ONLY.split(',').includes(b.id) : SPLIT === 'all' || splits[b.id] === SPLIT));

const browser = await chromium.launch({ channel: 'chrome' });
const outDir = (run) => path.join('results/seeded', config, 'run' + run);

async function snapshotDom(page) {
  return page.evaluate(() => {
    const out = [];
    for (const el of document.body.querySelectorAll('*')) {
      if (['SCRIPT', 'STYLE', 'BR', 'PATH', 'SVG'].includes(el.tagName)) continue;
      const cs = getComputedStyle(el), r = el.getBoundingClientRect();
      if (cs.display === 'none') { out.push(`<${el.tagName.toLowerCase()}${el.id ? ' #' + el.id : ''}${el.className && typeof el.className === 'string' ? ' .' + el.className.split(' ').join('.') : ''}> display:none`); continue; }
      const text = el.children.length === 0 ? (el.textContent || '').trim().slice(0, 40) : '';
      out.push(`<${el.tagName.toLowerCase()}${el.id ? ' #' + el.id : ''}${el.className && typeof el.className === 'string' ? ' .' + el.className.split(' ').join('.') : ''}> box=[${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.width)}x${Math.round(r.height)}] pos=${cs.position} z=${cs.zIndex} ovf=${cs.overflowX}/${cs.overflowY} scroll=${el.scrollWidth}x${el.scrollHeight} client=${el.clientWidth}x${el.clientHeight} color=${cs.color} bg=${cs.backgroundColor} font=${cs.fontFamily.slice(0, 30)} ${text ? 'text="' + text + '"' : ''}`);
    }
    return `viewport=${innerWidth}x${innerHeight} docScrollWidth=${document.documentElement.scrollWidth}\n` + out.join('\n');
  });
}
const wordsSubset = (a, b) => { const B = new Set(b.toLowerCase().match(/[\p{L}\p{N}$]+/gu) || []); return (a.toLowerCase().match(/[\p{L}\p{N}$]+/gu) || []).every((w) => B.has(w)); };
const extractJson = (t) => JSON.parse((t.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1] ?? t.match(/\{[\s\S]*\}/)[0]).trim());

function diffOutside(a, b, mask) {
  const A = PNG.sync.read(a), B = PNG.sync.read(b);
  if (A.width !== B.width || A.height !== B.height) return { changedFrac: 1, note: 'size differs' };
  let changed = 0, total = 0;
  for (let y = 0; y < A.height; y++) for (let x = 0; x < A.width; x++) {
    if (mask.some((m) => x >= m.l && x <= m.r && y >= m.t && y <= m.b)) continue;
    total++; const i = (y * A.width + x) * 4;
    if (Math.abs(A.data[i] - B.data[i]) > 16 || Math.abs(A.data[i + 1] - B.data[i + 1]) > 16 || Math.abs(A.data[i + 2] - B.data[i + 2]) > 16) changed++;
  }
  return { changedFrac: +(changed / total).toFixed(4) };
}

async function maskFor(page, bug) {
  return page.evaluate((sels) => sels.flatMap((s) => [...document.querySelectorAll(s)].map((e) => { const r = e.getBoundingClientRect(); return { l: r.left - 48, r: r.right + 48, t: r.top - 48, b: r.bottom + 48 }; })), bug.target);
}

async function runBug(bug, run) {
  const work = path.join('bench/_work/seeded-agent', config, 'run' + run, bug.id);
  await copyApp(APP, work); await applyMutation(work, bug.mutate);
  const rec = { bug: bug.id, cls: bug.cls, config, run, started: new Date().toISOString(), attempts: [] };
  const tag = (s) => `${config}/r${run}/${bug.id}/${s}`;
  // clean reference (grader only)
  const cleanPage = await loadPage(browser, APP, bug);
  const cleanShot = await cleanPage.screenshot(); const mask = await maskFor(cleanPage, bug);
  const cleanText = await cleanPage.evaluate(() => document.body.innerText); const cleanProbe = await probeTargets(cleanPage, bug.target); await cleanPage.close();

  const ctxNote = `Viewport ${(bug.viewport || { width: 1200, height: 800 }).width}x${(bug.viewport || { width: 1200, height: 800 }).height}.${bug.query ? ' URL query: ?' + bug.query + '.' : ''}${bug.hash ? ' URL hash: ' + bug.hash + '.' : ''}${bug.preFocus ? ' Keyboard focus is on ' + bug.preFocus + '.' : ''}${bug.id.includes('hover') ? ' The mouse is hovering over the Specs tab (#tab2).' : ''}`;
  let feedback = '';
  for (let n = 1; n <= MAX_ATTEMPTS; n++) {
    const att = { n };
    try {
      const page = await loadPage(browser, work, bug);
      if (bug.id.includes('hover')) await page.hover('#tab2');
      const shot = config !== 'dom' ? await page.screenshot() : null;
      const dom = config !== 'vision' ? await snapshotDom(page) : null;
      await page.close();
      const files = ['index.html', 'styles.css'].map((f) => `--- ${f}\n${fs.readFileSync(path.join(work, f), 'utf8')}`).join('\n');
      const body = `You are a front-end engineer. This web page has ONE visual bug. ${ctxNote}\n${dom ? '\nDOM / layout snapshot:\n' + dom + '\n' : ''}\nSource files:\n${files}\n${feedback}\nFind the bug and fix it with a minimal edit. Do not delete or hide content, or remove accessibility styling. Return ONLY JSON: {"edits":[{"file":"styles.css","find":"<exact existing text, unique in that file>","replace":"<new text>"}],"why":"<one sentence>"}`;
      const reply = await chat([shot ? imageMessage(body, shot) : { role: 'user', content: body }], { tag: tag('patch' + n) });
      att.why = (() => { try { return extractJson(reply).why; } catch { return null; } })();
      const edits = extractJson(reply).edits;
      for (const e of edits) {
        const fp = path.join(work, e.file); const t = fs.readFileSync(fp, 'utf8'); const c = t.split(e.find).length - 1;
        if (c !== 1) throw new Error(`edit target matched ${c} times in ${e.file}`);
        fs.writeFileSync(fp, t.replace(e.find, e.replace));
      }
      att.edits = edits.length;
      // self-verify with the same modality (no oracle, no clean reference)
      const vp = await loadPage(browser, work, bug); if (bug.id.includes('hover')) await vp.hover('#tab2');
      const vshot = config !== 'dom' ? await vp.screenshot() : null; const vdom = config !== 'vision' ? await snapshotDom(vp) : null; await vp.close();
      const vbody = `After your CSS edit (${att.why}), is the visual bug gone and nothing else broken? ${ctxNote}\n${vdom ? 'DOM snapshot:\n' + vdom + '\n' : ''}Reply JSON only: {"fixed":true|false,"reason":"..."}`;
      att.selfVerify = extractJson(await chat([vshot ? imageMessage(vbody, vshot) : { role: 'user', content: vbody }], { tag: tag('verify' + n), maxTokens: 8000 }));
      rec.attempts.push(att);
      if (att.selfVerify.fixed) break;
      feedback = `\nYour previous edit did not fix it (${att.selfVerify.reason}). The file now already contains that edit; propose a further edit.\n`;
    } catch (err) { att.error = String(err.message || err).slice(0, 300); rec.attempts.push(att); feedback = `\nPrevious attempt failed: ${att.error}\n`; }
  }
  // grade
  const gp = await loadPage(browser, work, bug);
  if (bug.id.includes('hover')) await gp.hover('#tab2');
  const o = await bug.oracle(gp);
  const finalText = await gp.evaluate(() => document.body.innerText);
  const finalShot = await gp.screenshot(); const finalProbe = await probeTargets(gp, bug.target); await gp.close();
  const reg = diffOutside(cleanShot, finalShot, mask);
  rec.grade = { oracle: !!o.pass, cheat: !wordsSubset(cleanText, finalText) || neutralised(finalProbe, cleanProbe), regressionFrac: reg.changedFrac, regression: !bug.noRegression && reg.changedFrac > 0.05, attempts: rec.attempts.length };
  rec.grade.fixed = rec.grade.oracle && !rec.grade.cheat && !rec.grade.regression;
  rec.finished = new Date().toISOString();
  fs.mkdirSync(outDir(run), { recursive: true });
  fs.writeFileSync(path.join(outDir(run), bug.id + '.json'), JSON.stringify(rec, null, 1));
  return rec;
}

const jobs = []; for (let r = 1; r <= RUNS; r++) for (const b of chosen) jobs.push([b, r]);
let done = 0, fixed = 0; const results = [];
async function worker() { while (jobs.length) { const [b, r] = jobs.shift(); let rec; try { rec = await runBug(b, r); } catch (e) { rec = { bug: b.id, run: r, error: String(e.message).slice(0, 200), grade: { fixed: false } }; } results.push(rec); done++; if (rec.grade?.fixed) fixed++; console.log(`[${done}] ${config} r${r} ${b.id}: ${rec.grade?.fixed ? 'FIXED' : 'not fixed'} ${rec.error || JSON.stringify(rec.grade)}`); } }
await Promise.all(Array.from({ length: CONC }, worker));
await browser.close();
console.log(`\n${config}: fixed ${fixed}/${done}`);
