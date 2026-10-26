// daisyui-4724: keyboard focus ring of the first breadcrumb link must not be clipped by the .breadcrumbs box.
export async function check(page) {
  await page.keyboard.press('Tab');
  const r = await page.evaluate(() => {
    const a = document.querySelector('#bc a'), c = document.querySelector('#bc');
    const cs = getComputedStyle(a);
    const ow = parseFloat(cs.outlineWidth) || 0, oo = parseFloat(cs.outlineOffset) || 0;
    const ab = a.getBoundingClientRect(), cb = c.getBoundingClientRect();
    return { focused: document.activeElement === a, outlineStyle: cs.outlineStyle, ow, oo,
      clippedLeft: Math.max(0, cb.left - (ab.left - oo - ow)) };
  });
  return { ...r, pass: r.focused && r.outlineStyle !== 'none' && r.clippedLeft <= 0.5 };
}
