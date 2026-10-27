// Run the Pixelsmith agent on REAL upstream bugs (Pico, daisyUI) under one config.
//   node agent/real-run.mjs <vision|dom|hybrid> [--runs N] [--only id,id] [--attempts N]
// Steps: capture buggy page -> model picks source files from a FILE LIST (not told the answer) -> model edits them -> rebuild -> self-verify -> retry.
// Grading uses the bug's check.mjs (never shown to the model), a content-preserved test, and a pixel diff vs the maintainers' real fix (informational).
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import { pathToFileURL } from 'node:url';
import { chat, imageMessage } from './llm.mjs';

const args = process.argv.slice(2);
const config = args[0];
if (!['vision', 'dom', 'hybrid'].includes(config)) throw new Error('config must be vision|dom|hybrid');
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const START = +opt('start', 1), RUNS = +opt('runs', 1), ONLY = opt('only', ''), MAX_ATTEMPTS = +opt('attempts', 2);
const ALL = ['pico-474', 'pico-585', 'pico-528', 'pico-615'];
const ids = ONLY ? ONLY.split(',') : ALL;

const NS = process.env.RESULTS_NS || '';   // e.g. '-meta' keeps Meta-API runs in results/real-meta
const sh = (cmd, cwd) => execSync(cmd, { cwd, stdio: 'pipe', encoding: 'utf8', maxBuffer: 1 << 26 });
const extractJson = (t) => JSON.parse((t.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1] ?? t.match(/\{[\s\S]*\}/)[0]).trim());
const wordsSubset = (a, b) => { const B = new Set(b.toLowerCase().match(/[\p{L}\p{N}$]+/gu) || []); return (a.toLowerCase().match(/[\p{L}\p{N}$]+/gu) || []).every((w) => B.has(w)); };

// Whitespace-tolerant unique match: exact first; otherwise tokens of `find` joined by \s+ must match EXACTLY ONE place.
function applyEdit(text, find, replace) {
  const exact = text.split(find).length - 1;
  if (exact === 1) return text.replace(find, () => replace);
  if (exact > 1) throw new Error(`edit target matched ${exact} times`);
  const toks = find.trim().split(/\s+/).filter(Boolean); if (!toks.length) throw new Error('empty find');
  const re = new RegExp(toks.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s*'), 'g');
  const hits = [...text.matchAll(re)];
  if (hits.length !== 1) throw new Error(`edit target matched ${hits.length} times (whitespace-tolerant)`);
  return text.slice(0, hits[0].index) + replace + text.slice(hits[0].index + hits[0][0].length);
}
const browser = await chromium.launch({ channel: 'chrome' });

async function load(bugDir, cssPath, tmp) {
  fs.mkdirSync(tmp, { recursive: true });
  fs.copyFileSync(cssPath, path.join(tmp, 'daisyui.css')); fs.copyFileSync(path.join(bugDir, 'page.html'), path.join(tmp, 'page.html'));
  const page = await browser.newPage({ viewport: { width: 900, height: 360 } });
  await page.goto(pathToFileURL(path.join(tmp, 'page.html')).href);
  return page;
}
async function snapshotDom(page) {
  return page.evaluate(() => {
    const out = [];
    for (const el of document.body.querySelectorAll('*')) {
      if (['SCRIPT', 'STYLE', 'BR'].includes(el.tagName)) continue;
      const cs = getComputedStyle(el), r = el.getBoundingClientRect();
      const attrs = [...el.attributes].map((a) => `${a.name}${a.value ? '=' + a.value : ''}`).join(' ').slice(0, 80);
      const text = el.children.length === 0 ? (el.textContent || '').trim().slice(0, 40) : '';
      out.push(`<${el.tagName.toLowerCase()} ${attrs}> box=[${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.width)}x${Math.round(r.height)}] display=${cs.display} color=${cs.color} bg=${cs.backgroundColor} ${text ? 'text="' + text + '"' : ''}`);
    }
    return out.join('\n');
  });
}
function diffFrac(a, b) { const A = PNG.sync.read(a), B = PNG.sync.read(b); if (A.width !== B.width || A.height !== B.height) return 1; let c = 0; for (let i = 0; i < A.data.length; i += 4) if (Math.abs(A.data[i] - B.data[i]) > 16 || Math.abs(A.data[i + 1] - B.data[i + 1]) > 16 || Math.abs(A.data[i + 2] - B.data[i + 2]) > 16) c++; return +(c / (A.width * A.height)).toFixed(4); }

async function runBug(id, run) {
  const bugDir = `bench/bugs/${id}`; const meta = JSON.parse(fs.readFileSync(path.join(bugDir, 'meta.json'), 'utf8'));
  const { check } = await import(pathToFileURL(path.resolve(bugDir, 'check.mjs')).href);
  const work = path.resolve('bench/_work/real' + NS, config, 'run' + run, id); fs.rmSync(work, { recursive: true, force: true }); fs.mkdirSync(work, { recursive: true });
  // source at the buggy commit: copy only scss/
  const SRC = `bench/_work/pico-src${NS}-${config}`;   // one checkout per config: configs run in parallel
  if (!fs.existsSync(path.join(SRC, '.git'))) { fs.mkdirSync(SRC, { recursive: true }); sh('git init -q', SRC); sh('git remote add origin https://github.com/picocss/pico.git', SRC); }
  sh(`git fetch -q --depth 1 origin ${meta.base_sha}`, SRC); sh('git checkout -q -f FETCH_HEAD', SRC);
  fs.cpSync(path.join(SRC, 'scss'), path.join(work, 'scss'), { recursive: true });
  const build = (out) => sh(`node node_modules/sass/sass.js --no-source-map --quiet --load-path="${path.join(work, 'scss')}" "${path.join(work, 'scss/pico.scss')}" "${out}"`);
  const files = []; (function walk(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) f.isDirectory() ? walk(path.join(d, f.name)) : files.push(path.relative(work, path.join(d, f.name)).replaceAll('\\', '/')); })(path.join(work, 'scss'));
  const css0 = path.join(work, 'buggy.css'); build(css0);
  const cssFix = path.resolve(`bench/_work/${id}-fixed.css`);       // upstream fix build, grader reference only
  const html = fs.readFileSync(path.join(bugDir, 'page.html'), 'utf8');
  const rec = { bug: id, config, run, started: new Date().toISOString(), attempts: [] };
  const tag = (s) => `real/${config}/r${run}/${id}/${s}`;

  let page = await load(bugDir, css0, path.join(work, 'p0'));
  const buggyShot = await page.screenshot(); const buggyText = await page.evaluate(() => document.body.innerText);
  const dom0 = config !== 'vision' ? await snapshotDom(page) : null; await page.close();
  const describe = (shot, dom) => `The library under test is Pico CSS (a classless/semantic CSS framework, compiled from SCSS). Page HTML:\n${html}\n${dom ? '\nDOM / computed-style snapshot:\n' + dom + '\n' : ''}`;
  // 1. pick files
  const pick = extractJson(await chat([config !== 'dom' ? imageMessage(describe(buggyShot, dom0) + '\nThis page has ONE visual/styling bug (something looks or behaves wrong for its CSS). Below is the library source file list. Return ONLY JSON {"files":["<up to 3 paths from the list most likely to contain the bug>"],"suspected":"<what is wrong, 1 sentence>"}\n' + files.join('\n'), buggyShot) : { role: 'user', content: describe(null, dom0) + '\nThis page has ONE styling bug. Source file list below. Return ONLY JSON {"files":["<up to 3 paths>"],"suspected":"..."}\n' + files.join('\n') }], { tag: tag('pick') }));
  rec.pick = pick;
  const chosen = (pick.files || []).filter((f) => files.includes(f)).slice(0, 3);
  let feedback = '';
  for (let n = 1; n <= MAX_ATTEMPTS; n++) {
    const att = { n };
    try {
      const src = chosen.map((f) => `--- ${f}\n${fs.readFileSync(path.join(work, f), 'utf8')}`).join('\n');
      const body = `You fix ONE styling bug in Pico CSS. Suspected: ${pick.suspected}\n${describe(null, dom0)}\nSource files:\n${src}\n${feedback}\nMake the minimal SCSS edit. Do not remove features, hide content, or special-case this page. Return ONLY JSON {"edits":[{"file":"<path as shown>","find":"<exact existing text, unique in that file>","replace":"<new text>"}],"why":"<one sentence>"}`;
      const reply = await chat([config !== 'dom' ? imageMessage(body, buggyShot) : { role: 'user', content: body }], { tag: tag('patch' + n) });
      const parsed = extractJson(reply); att.why = parsed.why;
      for (const e of parsed.edits) { const fp = path.join(work, e.file); fs.writeFileSync(fp, applyEdit(fs.readFileSync(fp, 'utf8'), e.find, e.replace)); }
      const cssN = path.join(work, `attempt${n}.css`); build(cssN);
      const vp = await load(bugDir, cssN, path.join(work, 'v' + n)); const vshot = await vp.screenshot(); const vdom = config !== 'vision' ? await snapshotDom(vp) : null; await vp.close();
      const vbody = `After your SCSS change (${att.why}) the page was rebuilt. Suspected bug was: ${pick.suspected}\n${vdom ? 'DOM snapshot:\n' + vdom + '\n' : ''}Is that bug gone and nothing else broken? Reply JSON only {"fixed":true|false,"reason":"..."}`;
      att.selfVerify = extractJson(await chat([config !== 'dom' ? imageMessage(vbody, vshot) : { role: 'user', content: vbody }], { tag: tag('verify' + n), maxTokens: 8000 }));
      att.css = cssN; rec.attempts.push(att);
      if (att.selfVerify.fixed) break;
      feedback = `\nYour previous edit did not fix it (${att.selfVerify.reason}). The files already contain that edit.\n`;
    } catch (err) { att.error = String(err.message || err).slice(0, 300); rec.attempts.push(att); feedback = `\nPrevious attempt failed: ${att.error}\n`; }
  }
  // grade the last attempt that built; else the buggy css
  const last = [...rec.attempts].reverse().find((a) => a.css); const finalCss = last?.css || css0;
  const gp = await load(bugDir, finalCss, path.join(work, 'g')); const o = await check(gp); const finalText = await gp.evaluate(() => document.body.innerText); const finalShot = await gp.screenshot(); await gp.close();
  let vsUpstream = null; if (fs.existsSync(cssFix)) { const fp = await load(bugDir, cssFix, path.join(work, 'u')); vsUpstream = diffFrac(finalShot, await fp.screenshot()); await fp.close(); }
  rec.grade = { oracle: !!o.pass, contentKept: wordsSubset(buggyText, finalText), pixelsDifferFromUpstreamFix: vsUpstream, attempts: rec.attempts.length, edited: !!last };
  rec.grade.fixed = rec.grade.oracle && rec.grade.contentKept && rec.grade.edited;
  rec.finished = new Date().toISOString();
  const out = `results/real${NS}/${config}/run${run}`; fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(`${out}/${id}.json`, JSON.stringify(rec, null, 1));
  return rec;
}

let done = 0, fixed = 0;
for (let r = START; r < START + RUNS; r++) for (const id of ids) {
  let rec; try { rec = await runBug(id, r); } catch (e) { rec = { bug: id, error: String(e.message).slice(0, 200), grade: { fixed: false } }; }
  done++; if (rec.grade?.fixed) fixed++;
  console.log(`[${done}] ${config} r${r} ${id}: ${rec.grade?.fixed ? 'FIXED' : 'not fixed'} ${rec.error || JSON.stringify(rec.grade)}`);
}
await browser.close();
console.log(`\n${config}: fixed ${fixed}/${done}`);
