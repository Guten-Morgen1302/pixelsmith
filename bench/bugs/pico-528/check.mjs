// pico-528: an <article> NESTED inside a modal's <article> must use plain card styling, not the modal's (width/margin/max-height).
export async function check(page) {
  const r = await page.evaluate(() => {
    const o = getComputedStyle(document.querySelector('#outer')), i = getComputedStyle(document.querySelector('#inner'));
    const ow = document.querySelector('#outer').getBoundingClientRect().width, iw = document.querySelector('#inner').getBoundingClientRect().width;
    return { innerWidth: iw, outerWidth: ow, innerMarginTop: i.marginTop, innerMaxHeight: i.maxHeight, outerMaxHeight: o.maxHeight };
  });
  return { ...r, pass: r.innerMaxHeight === 'none' };
}
