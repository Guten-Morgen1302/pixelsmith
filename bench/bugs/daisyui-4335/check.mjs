// daisyui-4335: on a very wide range input at max value, the filled bar must be uniform along its whole length.
import { PNG } from 'pngjs';
async function px(page, x, y) {
  const buf = await page.screenshot({ clip: { x, y, width: 1, height: 1 } });
  const { data } = PNG.sync.read(buf); return [data[0], data[1], data[2]];
}
export async function check(page) {
  await page.setViewportSize({ width: 2800, height: 200 });
  const box = await page.evaluate(() => { const b = document.querySelector('#r').getBoundingClientRect(); return { y: b.top + b.height / 2, w: b.width }; });
  const near = await px(page, 2300, box.y), far = await px(page, 300, box.y);
  const diff = Math.max(...near.map((v, i) => Math.abs(v - far[i])));
  return { width: box.w, filledPixel: near, farLeftPixel: far, colourDiff: diff, pass: diff <= 12 };
}
