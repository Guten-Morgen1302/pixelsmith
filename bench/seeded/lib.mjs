// Seeded-bench helpers: in-page measurement helpers and page loading for a bug spec.
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const HELPERS = `(() => {
  const $ = (s) => document.querySelector(s);
  const R = (s) => { const r = $(s).getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height, cx: r.left + r.width / 2, cy: r.top + r.height / 2 }; };
  const parse = (c) => { const m = c.match(/[\\d.]+/g).map(Number); return { r: m[0], g: m[1], b: m[2], a: m.length > 3 ? m[3] : 1 }; };
  const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const bgOf = (el) => { while (el) { const c = parse(getComputedStyle(el).backgroundColor); if (c.a > 0.5) return c; el = el.parentElement; } return { r: 255, g: 255, b: 255, a: 1 }; };
  const fg = (s) => parse(getComputedStyle($(s)).color);
  const hscroll = () => document.documentElement.scrollWidth > window.innerWidth + 0.5;
  const topAt = (x, y) => document.elementFromPoint(x, y);
  window.__h = { $, R, parse, contrast, bgOf, fg, hscroll, topAt };
})()`;

export async function loadPage(browser, appDir, spec) {
  const vp = spec.viewport || { width: 1200, height: 800 };
  const page = await browser.newPage({ viewport: vp });
  const url = pathToFileURL(path.resolve(appDir, 'index.html')).href + (spec.query ? '?' + spec.query : '') + (spec.hash || '');
  await page.goto(url);
  await page.waitForTimeout(150);
  await page.evaluate(HELPERS);
  if (spec.preFocus) { await page.keyboard.press('Tab'); await page.focus(spec.preFocus); await page.waitForTimeout(50); }
  return page;
}

export async function copyApp(srcDir, destDir) {
  await fs.rm(destDir, { recursive: true, force: true });
  await fs.mkdir(destDir, { recursive: true });
  for (const f of await fs.readdir(srcDir)) await fs.copyFile(path.join(srcDir, f), path.join(destDir, f));
}

export async function applyMutation(appDir, mutate) {
  const p = path.join(appDir, 'styles.css');
  let css = await fs.readFile(p, 'utf8');
  for (const [find, replace] of mutate) {
    const n = css.split(find).length - 1;
    if (n !== 1) throw new Error(`mutation find matched ${n} times: ${find.slice(0, 60)}`);
    css = css.replace(find, replace);
  }
  await fs.writeFile(p, css);
}
