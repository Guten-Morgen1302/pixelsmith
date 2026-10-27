// pico-585: striped table must alternate backgrounds across VISIBLE rows even when a row is [hidden].
export async function check(page) {
  const r = await page.evaluate(() => ['#r1', '#r2', '#r3', '#r4'].map((s) => getComputedStyle(document.querySelector(s + ' td')).backgroundColor));
  const alternates = r.every((c, i) => i === 0 || c !== r[i - 1]);
  return { backgrounds: r, pass: alternates };
}
