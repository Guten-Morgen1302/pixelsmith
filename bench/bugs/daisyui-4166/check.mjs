// daisyui-4166: a single-digit countdown must sit on the same baseline as the neighbouring text.
export async function check(page) {
  const r = await page.evaluate(() => {
    const v = document.querySelector('#v').getBoundingClientRect(), t = document.querySelector('#t').getBoundingClientRect();
    return { countdownBottom: v.bottom, textBottom: t.bottom, countdownTop: v.top, textTop: t.top };
  });
  const off = Math.abs(r.countdownBottom - r.textBottom);
  return { ...r, bottomOffsetPx: off, pass: off <= 2 };
}
