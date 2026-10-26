// daisyui-4179: a <select multiple> with more options than fit must show a scrollbar so users can see/scroll the overflow.
export async function check(page) {
  const r = await page.evaluate(() => {
    const s = document.querySelector('#s'), cs = getComputedStyle(s);
    const border = parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth);
    return { overflowY: cs.overflowY, scrollbarGutterPx: s.offsetWidth - s.clientWidth - border };
  });
  return { ...r, pass: r.scrollbarGutterPx >= 8 };
}
