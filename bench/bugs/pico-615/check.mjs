// pico-615: a plain accordion <details> nested inside a dropdown must render as an accordion, not as a dropdown select.
// Oracle: the nested summary must not get the dropdown "select" styling (border + padded box).
export async function check(page) {
  const r = await page.evaluate(() => {
    const s0 = getComputedStyle(document.querySelector('#s0')), s1 = getComputedStyle(document.querySelector('#s1'));
    return { dropdownSummaryBorder: s0.borderTopWidth, nestedSummaryBorder: s1.borderTopWidth, nestedBg: s1.backgroundColor, nestedWidth: document.querySelector('#s1').getBoundingClientRect().width, parentWidth: document.querySelector('#acc').getBoundingClientRect().width };
  });
  return { ...r, pass: parseFloat(r.nestedSummaryBorder) === 0 };
}
