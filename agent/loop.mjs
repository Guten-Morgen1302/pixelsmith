// Reference agent for Pixelsmith-Bench (DOM-grounded config).
// capture -> detect (vision) -> localize (DOM classes -> source file) -> patch (LLM edits) -> rebuild -> self-verify (vision) -> retry.
// The bench ORACLE grades every attempt separately and is NEVER shown to the model.
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { measureBug } from '../bench/lib/harness.mjs';
import { chat, imageMessage } from './llm.mjs';

const bugDir = process.argv[2] || 'bench/bugs/daisyui-4724';
const MAX_ATTEMPTS = 3;
const meta = JSON.parse(fs.readFileSync(path.join(bugDir, 'meta.json'), 'utf8'));
const SRC = 'bench/_work/daisyui-src';
const PKG = path.join(SRC, 'packages/daisyui');
const run = { bug: meta.id, config: 'dom+vision', started: new Date().toISOString(), attempts: [] };

const sh = (cmd, cwd) => execSync(cmd, { cwd, stdio: 'pipe', encoding: 'utf8' });
const rebuild = (out) => { sh('bun run build', PKG); fs.copyFileSync(path.join(PKG, 'daisyui.css'), out); };
const extractJson = (t) => JSON.parse((t.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1] ?? t.match(/\{[\s\S]*\}/)[0]).trim());

// 0. buggy build at base commit
sh(`bash bench/tools/build-daisy.sh ${meta.base_sha} bench/_work/${meta.id}-agent-0.css`);
sh('git checkout -q -f ' + meta.base_sha, SRC);
const shotDir = path.join('results/runs', meta.id); fs.mkdirSync(shotDir, { recursive: true });

// 1. capture
let css = `bench/_work/${meta.id}-agent-0.css`;
let shot = path.join(shotDir, 'attempt0.png');
await measureBug(bugDir, css, shot);
const html = fs.readFileSync(path.join(bugDir, 'page.html'), 'utf8');

// 2. detect (vision)
const defect = await chat([imageMessage(
  `Screenshot of a page built with the daisyUI CSS library. Page HTML:\n${html}\n\nThe first link has keyboard focus. Find any VISUAL defect (clipping, overflow, misalignment, overlap). Reply with 2 sentences: what is wrong and where.`,
  fs.readFileSync(shot))], { tag: 'detect' });
run.detect = defect;

// 3. localize via DOM: class names on the page -> component CSS files that style them
const classes = [...new Set([...html.matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/)))];
const compDir = path.join(PKG, 'src/components');
const files = fs.readdirSync(compDir).filter((f) => f.endsWith('.css')).map((f) => ({ f, text: fs.readFileSync(path.join(compDir, f), 'utf8') }));
const cand = files.filter(({ text }) => classes.some((c) => text.includes('.' + c))).map((x) => x.f);
run.candidates = cand;
const candText = cand.slice(0, 3).map((f) => `--- ${path.join('packages/daisyui/src/components', f)}\n${fs.readFileSync(path.join(compDir, f), 'utf8')}`).join('\n');

// 4-6. patch / rebuild / verify loop
let feedback = '';
for (let i = 1; i <= MAX_ATTEMPTS; i++) {
  const reply = await chat([{ role: 'user', content:
    `You fix visual CSS bugs in the daisyUI library.\nObserved defect: ${defect}\n${feedback}\nPage HTML:\n${html}\n\nCandidate source files:\n${candText}\n\nReturn ONLY JSON: {"edits":[{"file":"<path exactly as shown>","find":"<exact existing text, unique in file>","replace":"<new text>"}],"why":"<one sentence>"}. Keep the change minimal. Do not hide, remove or disable any element, outline or scrolling behaviour.` }],
    { tag: 'patch' + i });
  const att = { n: i, reply: reply.slice(0, 1500) };
  try {
    sh('git checkout -q -f ' + meta.base_sha, SRC);
    for (const e of extractJson(reply).edits) {
      const fp = path.join(SRC, e.file); const text = fs.readFileSync(fp, 'utf8');
      const n = text.split(e.find).length - 1;
      if (n !== 1) throw new Error(`edit target matched ${n} times in ${e.file}`);
      fs.writeFileSync(fp, text.replace(e.find, e.replace));
    }
    att.diff = sh('git diff', SRC);
    css = `bench/_work/${meta.id}-agent-${i}.css`; rebuild(css);
    shot = path.join(shotDir, `attempt${i}.png`);
    att.oracle = await measureBug(bugDir, css, shot);     // grader only; not shown to the model
    const verdict = await chat([imageMessage(
      `Same page after a CSS change. Original defect: ${defect}\nLook at the screenshot. Is that defect gone and nothing else broken? Reply JSON only: {"fixed":true|false,"reason":"..."}`, fs.readFileSync(shot))], { tag: 'verify' + i });
    att.selfVerify = extractJson(verdict);
    run.attempts.push(att);
    if (att.selfVerify.fixed) break;
    feedback = `A previous attempt did not satisfy visual verification: ${att.selfVerify.reason}\nPrevious diff:\n${att.diff}\n`;
  } catch (err) { att.error = String(err.message || err); run.attempts.push(att); feedback = `Previous attempt failed to apply or build: ${att.error}\n`; }
}
const last = run.attempts.at(-1);
run.graded = { pass: !!last?.oracle?.pass, cheat: !!last?.oracle?.cheat, attempts: run.attempts.length };
run.finished = new Date().toISOString();
fs.writeFileSync(path.join(shotDir, 'run.json'), JSON.stringify(run, null, 1));
console.log(JSON.stringify({ bug: meta.id, graded: run.graded, candidates: run.candidates, finalDiff: last?.diff?.slice(0, 600) }, null, 1));
