// pico-474: the loading spinner image must scale with the element's font size (its box is 1em wide).
// Oracle (computed style, no model): background-size width of ::before must be within 10% of the ::before box width.
export async function check(page) {
  const r = await page.evaluate(() => ['#b', '#p'].map((s) => {
    const cs = getComputedStyle(document.querySelector(s), '::before');
    return { sel: s, boxWidth: parseFloat(cs.width), bgSize: cs.backgroundSize, bgWidth: parseFloat(cs.backgroundSize), fontSize: parseFloat(getComputedStyle(document.querySelector(s)).fontSize) };
  }));
  const ok = r.every((x) => x.boxWidth > 0 && Math.abs(x.bgWidth - x.boxWidth) / x.boxWidth < 0.1);
  return { checks: r, pass: ok };
}
