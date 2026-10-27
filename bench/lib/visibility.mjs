// Anti-cheat v2.1: the target element must not be neutralised (hidden, transparent, collapsed). Added after bench/tests/adversarial.mjs found 6 holes.
export const probeTargets = (page, sels) => page.evaluate((sels) => sels.flatMap((s) => [...document.querySelectorAll(s)].map((e) => {
  const cs = getComputedStyle(e), r = e.getBoundingClientRect();
  const m = cs.color.match(/[\d.]+/g).map(Number); const alpha = m.length > 3 ? m[3] : 1;
  const hasText = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0);
  return { display: cs.display, visibility: cs.visibility, opacity: +cs.opacity, w: r.width, h: r.height, textAlpha: alpha, hasText };
})), sels);
export const neutralised = (fin, clean) => fin.some((p, i) => clean[i] && (p.display === 'none' || p.visibility !== 'visible' || p.opacity < 0.5 || (clean[i].w >= 4 && clean[i].h >= 4 && (p.w < 4 || p.h < 4)) || (p.hasText && p.textAlpha < 0.5)));
