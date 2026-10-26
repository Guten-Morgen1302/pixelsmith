// Shared bench harness: load a bug's page.html with a given built CSS, run the bug's check(page), return result.
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export async function measureBug(bugDir, cssPath, shotPath, viewport = { width: 900, height: 360 }) {
  const { check } = await import(pathToFileURL(path.resolve(bugDir, 'check.mjs')).href);
  const work = path.resolve('bench/_work', 'page-' + Math.random().toString(36).slice(2));
  await fs.mkdir(work, { recursive: true });
  await fs.copyFile(cssPath, path.join(work, 'daisyui.css'));
  await fs.copyFile(path.join(bugDir, 'page.html'), path.join(work, 'page.html'));
  const browser = await chromium.launch({ channel: 'chrome' });
  try {
    const page = await browser.newPage({ viewport });
    await page.goto(pathToFileURL(path.join(work, 'page.html')).href);
    const result = await check(page);
    if (shotPath) { await fs.mkdir(path.dirname(shotPath), { recursive: true }); await page.screenshot({ path: shotPath }); }
    return result;
  } finally { await browser.close(); await fs.rm(work, { recursive: true, force: true }); }
}

if (process.argv[1]?.endsWith('harness.mjs')) {
  const [bugDir, css, shot] = process.argv.slice(2);
  console.log(JSON.stringify(await measureBug(bugDir, css, shot)));
}
