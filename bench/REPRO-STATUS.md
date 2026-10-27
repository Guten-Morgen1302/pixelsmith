# Bug reproduction status (honest log)

A bug counts for the bench only if, in the same browser, the buggy commit FAILS the oracle and the upstream fix PASSES it.
Environment: Google Chrome via Playwright (channel chrome), Windows, bun 1.4, node 24, 2026-10-26.

| Bug | Upstream | Status | Notes |
|---|---|---|---|
| daisyui-4724 | saadeghi/daisyui#4724 | REPRODUCED | focus ring clipped 4px on buggy, 0px on fix |
| daisyui-4179 | #4179 select multiple overflow | NOT REPRODUCED | overflow:hidden vs auto differ in computed style, but Chrome wheel-scrolls the listbox either way and no scrollbar gutter appeared; no visual difference found |
| daisyui-4335 | #4335 wide range fill | NOT REPRODUCED | at width 2600px the fill looked uniform on the buggy build too |
| daisyui-4166 | #4166 countdown alignment | NOT REPRODUCED | single-digit baseline offset identical (5px) on buggy and fix |
| daisyui-4718 megamenu, docusaurus-11500, mantine-9268, chakra-10979/11015, react-spectrum-8527 | various | NOT ATTEMPTED YET | need heavier builds or specific markup |

Build shim: older daisyUI commits call `fs.rmdir(p,{recursive:true})`, removed in Node 24 / Bun 1.4. `bench/tools/build-daisy.sh` swaps it for `fs.rm(...)` in `removeFiles.js` only; CSS sources are untouched.

Lesson: many real visual fixes are browser-, viewport- or markup-specific. Expect roughly 1 in 4 attempts to reproduce with a simple oracle; plan the real-bug count from that, not from the candidate list, and be honest about it in the README.

## First end-to-end agent run (2026-10-27)
Config: dom+vision, Muse Spark Open (Baseten, reasoning_effort=low). Bug: daisyui-4724. n=1, not a measurement.
- Attempt 1: model's edit did not apply (find text matched 0 times). Recorded as a failed attempt.
- Attempt 2: added `px-1` to `.breadcrumbs`. Oracle: PASS (0 px clipped, no anti-cheat flags). Self-verify (vision): fixed.
- Upstream fix used `-ms-1` on the container plus `ps-1` on the list; the agent's patch fixes the clipping but shifts the crumbs 4 px right. Counts as "different but passing", not an exact match.
- The oracle is never shown to the model; self-verification is a separate vision call.
- Tokens: 6 calls, ~12.6k completion (12.2k reasoning), ~4.4k prompt. See results/cost.jsonl.
