// Validity check: every seeded bug must FAIL its oracle on the buggy app and PASS it on the clean app.
import { chromium } from 'playwright';
import path from 'node:path';
import { bugs } from './bugs.mjs';
import { loadPage, copyApp, applyMutation } from './lib.mjs';

const APP = 'bench/seeded/app';
const only = process.argv[2];
const browser = await chromium.launch({ channel: 'chrome' });
const rows = [];
for (const bug of bugs.filter((b) => !only || b.id === only)) {
  const row = { id: bug.id, cls: bug.cls };
  try {
    const clean = await loadPage(browser, APP, bug); const c = await bug.oracle(clean); await clean.close();
    const work = path.join('bench/_work/seeded', bug.id);
    await copyApp(APP, work); await applyMutation(work, bug.mutate);
    const buggy = await loadPage(browser, work, bug); const b = await bug.oracle(buggy); await buggy.close();
    row.clean = c.pass; row.buggy = b.pass; row.valid = c.pass === true && b.pass === false;
    if (!row.valid) row.detail = { clean: c, buggy: b };
  } catch (e) { row.error = String(e.message).slice(0, 200); row.valid = false; }
  rows.push(row);
  console.log(row.valid ? 'OK  ' : 'BAD ', row.id, row.error || (row.valid ? '' : JSON.stringify(row.detail)));
}
await browser.close();
console.log(`\nvalid ${rows.filter((r) => r.valid).length}/${rows.length}`);
