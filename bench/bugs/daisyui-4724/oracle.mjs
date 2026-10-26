// Oracle for daisyui-4724: the keyboard focus ring of the first breadcrumb link must not be
// clipped by the scrolling .breadcrumbs container. Pass = ring rect fully inside container clip rect.
import { chromium } from 'playwright';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export async function measure(cssPath, shotPath) {
  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 640, height: 240 } });
  const dir = path.resolve('bench/_work/page-' + Math.random().toString(36).slice(2));
  const fs = await import('node:fs/promises');
  await fs.mkdir(dir, { recursive: true });
  await fs.copyFile(cssPath, path.join(dir, 'daisyui.css'));
  await fs.copyFile('bench/bugs/daisyui-4724/page.html', path.join(dir, 'page.html'));
  await page.goto(pathToFileURL(path.join(dir, 'page.html')).href);
  await page.keyboard.press('Tab'); // focus-visible on the first link
  const r = await page.evaluate(() => {
    const a = document.querySelector('#bc a');
    const c = document.querySelector('#bc');
    const cs = getComputedStyle(a);
    const ow = parseFloat(cs.outlineWidth) || 0, oo = parseFloat(cs.outlineOffset) || 0;
    const ab = a.getBoundingClientRect(), cb = c.getBoundingClientRect();
    const ring = { left: ab.left - oo - ow, right: ab.right + oo + ow, top: ab.top - oo - ow, bottom: ab.bottom + oo + ow };
    return {
      focused: document.activeElement === a, outlineStyle: cs.outlineStyle, ow, oo,
      ring, clip: { left: cb.left, right: cb.right, top: cb.top, bottom: cb.bottom },
      clippedLeft: Math.max(0, cb.left - ring.left),
    };
  });
  if (shotPath) await page.screenshot({ path: shotPath, clip: { x: 0, y: 0, width: 520, height: 120 } });
  await browser.close();
  await fs.rm(dir, { recursive: true, force: true });
  return { ...r, pass: r.focused && r.outlineStyle !== 'none' && r.clippedLeft <= 0.5 };
}

if (process.argv[1].endsWith('oracle.mjs')) {
  const [css, shot] = process.argv.slice(2);
  console.log(JSON.stringify(await measure(css, shot), null, 1));
}
