# Pixelsmith-Bench

An open, runnable way to measure and fix visual bugs in web UIs, built on Meta models for the Meta Global AI Developer Hackathon (team consolelog, Indie track).

> Status: work in progress (Oct 27). Numbers below are measured from the committed runs in `results/`; see limitations.

## What was built during the hackathon (Oct 26 - Nov 4, 2026)
Everything in this repository's commit history, starting from the first commit made after the Oct 26 kickoff:
- the benchmark harness and anti-cheat oracle
- the reference agent (capture, detect, localize, patch, verify, retry)
- the adapter interface for running other agents against the bench
- result tables, cost logging and the demo tooling

## Third-party data (not our code)
The bench replays real bugs from existing open-source UI projects, at the commit just before each upstream fix. These projects are used as data only and keep their own licenses:
- Mantine (MIT), Chakra UI (MIT), Docusaurus (MIT), daisyUI (MIT), React Spectrum (Apache-2.0)

Each bug entry records the upstream PR, the buggy base commit and the merged fix commit.

## Related work
SWE-bench Multimodal (arXiv 2410.03859), Seeing is Fixing (2506.16136), VisualRepair (2607.14075). This project is not the first visual-repair benchmark; it aims to be a cheap, runnable one with an anti-cheat check and regression counts.

## Secrets
Keys live in a local `.env` (git-ignored). See `.env.example`.

## Early results (Muse Spark Open via Baseten, reasoning_effort=low)
Seeded bench: 28 visual bugs on a demo app (19 dev / 9 held-out), each with a programmatic oracle that is never shown to the agent. Held-out split, 3 runs per bug, up to 2 attempts, agent self-verifies from its own screenshot/DOM:

| Config | strict fixed (oracle + no cheat + no regression) | oracle pass only |
|---|---|---|
| vision (screenshot + source) | 24/27 = 89% (95% CI 72-96%) | 27/27 |
| dom (DOM/layout snapshot + source) | 23/27 = 85% (68-94%) | 26/27 |
| hybrid (both) | 24/27 = 89% (72-96%) | 26/27 |

Dev split (1 run): vision 18/19, dom 15/19, hybrid 16/19 (see `results/SUMMARY.txt`; `python bench/summarize.py dev|heldout`).

**Honest reading:** the three configs are statistically indistinguishable on these seeded web bugs; confidence intervals overlap almost entirely. Adding DOM data did not beat vision alone.

Limitations:
- Seeded bugs are authored by us; they say little about real-world fix rate. Real bugs: 5 reproduced (`bench/bugs/`), 4 more tried and not reproducible or abandoned (`bench/REPRO-STATUS.md`).
- The regression metric (pixels changed outside the target region) flags valid alternative fixes that shift layout below the target (e.g. a different `clamp()` for a heading). That is why "oracle pass only" is reported next to the strict number. The metric was not changed after seeing held-out results.
- Bench v2 amendments (clean-app bug, anti-cheat, thresholds) were made after the first dev run and before any held-out run; they are listed in `bench/REPRO-STATUS.md`. Tag `bench-v2-frozen`.
- **SAM is not in the loop.** Pre-registered localisation spike (`param/sam_spike/`, SAM 3 `facebook/sam3` on an A100, 28 buggy screenshots, plain concept phrases, IoU >= 0.5 vs DOM boxes): 4/28 = 14%, below the 60% bar we set beforehand. SAM returned no box for 23/28 pages (modal dialogs, tables, nav bars, inputs are not what it detects at score 0.5); its 4 hits (button, image, heading) were precise. SAM 3.1 was not tested. The DOM path already localises these targets, so SAM adds nothing to the measured results.

## Real upstream bugs (Pico CSS), 4 bugs x 3 runs x 3 configs
Four real bugs from picocss/pico (MIT): the agent sees the buggy page, is given only a LIST of the library's SCSS files, picks which to open, edits the SCSS, rebuilds, self-verifies. A separate oracle (never shown to the model) grades the final build; the maintainers' merged fix is used only to measure how close the result is.

| Config | fixed (oracle pass + content kept + edit applied) |
|---|---|
| vision | 12/12 = 100% (95% CI 76-100%) |
| hybrid (screenshot + DOM) | 10/12 = 83% (55-95%) |
| dom (DOM/computed-style snapshot only) | 5/12 = 42% (19-68%) |

By bug: pico-585 (striped table + [hidden] row) was fixed by every config; pico-474 (spinner is a ::before) and pico-615 (details nested in dropdown) were never fixed by dom-only; vision fixed all four. Fixed patches differ from the maintainers' real fix by 0.00-0.40% of pixels on the test page. Reproduce: `python bench/summarize-real.py`.

Read this carefully:
- **Possible memorisation.** These are public bugs merged in 2023-2025 in a public repo; the model may have seen the fix. The near-identical patches are consistent with that. The seeded suite (novel bugs) is the cleaner test; the real bugs show it works on real code, not that it generalises.
- **Two of four oracles (pico-528, pico-615) are computed-style checks**, weaker than pixel evidence. pico-474 and pico-585 show visible differences (screenshots in `bench/bugs/*/out/`).
- n = 4 bugs; the intervals are wide and the vision-vs-hybrid gap is not significant. The vision-vs-dom gap on these bugs is suggestive (intervals barely touch), not conclusive.
- First attempt at this run failed for tooling reasons (exact-match edits: 39 of 40 errors were whitespace mismatches, and a shared git checkout raced between configs). Both were fixed in `agent/real-run.mjs` before any result above was kept; the discarded runs are in `results/_tooling-v1-exact-match` and `results/_discarded-real-race`.
- Unlike the seeded bench, on real bugs the DOM snapshot did NOT help; screenshots mattered most. On seeded bugs all three configs were statistically equal.
