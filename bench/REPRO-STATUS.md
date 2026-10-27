# Bug reproduction status (honest log)

A bug counts for the bench only if, in the same browser, the buggy commit FAILS the oracle and the upstream fix PASSES it.
Environment: Google Chrome via Playwright (channel chrome), Windows, bun 1.4, node 24, 2026-10-26.

| Bug | Upstream | Status | Notes |
|---|---|---|---|
| daisyui-4724 | saadeghi/daisyui#4724 | REPRODUCED | focus ring clipped 4px on buggy, 0px on fix |
| daisyui-4179 | #4179 select multiple overflow | NOT REPRODUCED | overflow:hidden vs auto differ in computed style, but Chrome wheel-scrolls the listbox either way and no scrollbar gutter appeared; no visual difference found |
| daisyui-4335 | #4335 wide range fill | NOT REPRODUCED | at width 2600px the fill looked uniform on the buggy build too |
| daisyui-4166 | #4166 countdown alignment | NOT REPRODUCED | single-digit baseline offset identical (5px) on buggy and fix |
| docusaurus-11500 | facebook/docusaurus#11500 | ABANDONED | Windows checkout fails on long fixture paths ('Filename too long'); the fix lives in a website CSS module that needs the whole yarn monorepo built. Not worth the time budget here |
| daisyui-4718 megamenu, mantine-9268, chakra-10979/11015, react-spectrum-8527 | various | NOT ATTEMPTED | need heavier builds or specific markup per bug |

Build shim: older daisyUI commits call `fs.rmdir(p,{recursive:true})`, removed in Node 24 / Bun 1.4. `bench/tools/build-daisy.sh` swaps it for `fs.rm(...)` in `removeFiles.js` only; CSS sources are untouched.

Lesson: many real visual fixes are browser-, viewport- or markup-specific. Expect roughly 1 in 4 attempts to reproduce with a simple oracle; plan the real-bug count from that, not from the candidate list, and be honest about it in the README.

## First end-to-end agent run (2026-10-27)
Config: dom+vision, Muse Spark Open (Baseten, reasoning_effort=low). Bug: daisyui-4724. n=1, not a measurement.
- Attempt 1: model's edit did not apply (find text matched 0 times). Recorded as a failed attempt.
- Attempt 2: added `px-1` to `.breadcrumbs`. Oracle: PASS (0 px clipped, no anti-cheat flags). Self-verify (vision): fixed.
- Upstream fix used `-ms-1` on the container plus `ps-1` on the list; the agent's patch fixes the clipping but shifts the crumbs 4 px right. Counts as "different but passing", not an exact match.
- The oracle is never shown to the model; self-verification is a separate vision call.
- Tokens: 6 calls, ~12.6k completion (12.2k reasoning), ~4.4k prompt. See results/cost.jsonl.

## Seeded suite (2026-10-27)
28 seeded bugs on a clean demo app (`bench/seeded/app`), 7 classes (overflow 6, responsive 4, stacking 4, spacing 4, contrast 4, media 3, state 3).
Validity rule: oracle FAILS on the mutated app and PASSES on the clean app, in Chrome via Playwright. `node bench/seeded/validate.mjs` -> valid 28/28.
First pass had 3 invalid bugs (card-title: grid min-content hid the overflow; badge-clipped and badge-contrast oracles mis-calibrated); fixed in the clean app / oracles before freezing. The seeded bugs are authored by us, so they are NOT evidence of real-world fix rate; the real-bug subset (bench/bugs) is reported separately.

## Bench v2 amendments (2026-10-27), made after the first dev-split run, BEFORE any held-out run
The first dev run exposed defects in the bench itself, not in the agent. Fixed, then v1 results discarded (kept in results/_discarded-v1):
1. Clean app bug: `.menu-toggle{display:none}` was overridden by `.btn{display:inline-flex}`, so a stray menu button showed on desktop. Agents (correctly) "fixed" it and were scored as regressions. Now `.btn.menu-toggle`.
2. Anti-cheat compared innerText equal to the clean render, which punished valid fixes that keep MORE content visible. Now: every word of the clean page must still be present (superset).
3. focus-ring bug injection also deleted the padding; a correct fix then looked like a regression. Now it only adds `overflow:hidden` (clean padding 2px). Oracle now tests real ancestor clipping instead of "ring inside the field box".
4. Regression metric: pixels changed outside the target region (+48px margin) vs the clean render; threshold raised from 1% to 5% because valid alternative fixes shift layout by 2-3%. `stacking-sticky-hides-anchor` is exempt (any valid fix changes the scroll offset).
Thresholds were chosen after looking at DEV results only. The held-out split (9 bugs) had not been run when these were set (one smoke run of overflow-toast-offscreen on `vision` was made earlier and its result file deleted; its outcome was not used).
