// daisyui-4724: keyboard focus ring of the first breadcrumb link must not be clipped by the .breadcrumbs box.
// Anti-cheat: outline must stay visible, the container must remain a horizontal scroller, all crumbs must stay visible.
export async function check(page) {
  await page.keyboard.press('Tab');
  const r = await page.evaluate(() => {
    const a = document.querySelector('#bc a'), c = document.querySelector('#bc');
    const cs = getComputedStyle(a), cc = getComputedStyle(c);
    const ow = parseFloat(cs.outlineWidth) || 0, oo = parseFloat(cs.outlineOffset) || 0;
    const ab = a.getBoundingClientRect(), cb = c.getBoundingClientRect();
    const crumbs = [...document.querySelectorAll('#bc li')];
    return { focused: document.activeElement === a, outlineStyle: cs.outlineStyle, ow, oo,
      overflowX: cc.overflowX, allCrumbsVisible: crumbs.every((li) => { const b = li.getBoundingClientRect(); return b.width > 0 && b.height > 0 && getComputedStyle(li).visibility !== 'hidden' && getComputedStyle(li).display !== 'none'; }),
      clippedLeft: Math.max(0, cb.left - (ab.left - oo - ow)) };
  });
  const cheat = r.outlineStyle === 'none' || r.ow < 1 || r.overflowX === 'visible' || !r.allCrumbsVisible;
  return { ...r, cheat, pass: r.focused && !cheat && r.clippedLeft <= 0.5 };
}
