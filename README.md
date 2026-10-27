# Pixelsmith-Bench

An agent that fixes visual bugs in web UIs by looking at the running page, plus a bench with a hidden grader that measures how often it actually works (and whether it cheats). Built for the Meta Global AI Developer Hackathon, team **consolelog**, Indie track.

**Models:** Meta's open-weights **Muse Spark Open** (`meta-models/muse-spark-open-1026`), served by Baseten. The Meta Model API was not used (it needs a payment method). SAM 3 was tested and rejected by a pre-registered test (see below).

## Results at a glance

| What | Result | n |
|---|---|---|
| Seeded bugs, held-out split, strict grading | vision 24/27 (89%), hybrid 24/27 (89%), dom 23/27 (85%) | 9 bugs x 3 runs per config |
| Real upstream bugs (Pico CSS), the agent must find the right SCSS file itself | vision 12/12, hybrid 10/12, dom 5/12 | 4 bugs x 3 runs per config |
| Grader self-test: 5 cheats (hide, transparent, zero-size...) on all 28 bugs | 0 of 140 accepted as fixes (after fixing 6 holes it first had) | 140 |
| SAM 3 as a localiser (pre-registered, bar 60%) | **4/28 = 14%: SAM stays out of the agent** | 28 screenshots |

Confidence intervals, per-bug tables and every caveat are below. The honest headline: a screenshot-driven Muse Spark Open loop fixes most of these bugs, DOM data did not help, and SAM did not clear our own bar.

## What was built during the hackathon (Oct 26 - Nov 4, 2026)
Everything in this repository's commit history, starting from the first commit made after the Oct 26 kickoff:
- **Seeded bench** (`bench/seeded/`): a demo web app and 28 CSS-injected visual bugs in 7 classes, each with a programmatic oracle, validated to fail on the buggy app and pass on the clean one. Frozen with a 19 dev / 9 held-out split (tags `bench-v1-frozen`, `bench-v2-frozen`).
- **Real-bug cases** (`bench/bugs/`): 5 real upstream bugs, each reproduced (buggy commit fails its oracle, the maintainers' fix passes): daisyUI #4724 and Pico #474, #585, #528, #615. Build tools in `bench/tools/`.
- **The agent** (`agent/`): capture, detect, pick files, patch, rebuild, self-verify, retry, in three configs: `vision` (screenshot), `dom` (DOM and computed-style snapshot), `hybrid` (both). The oracle and the clean reference are never shown to the model.
- **Grader** (`agent/seeded-run.mjs`, `bench/lib/visibility.mjs`): oracle pass, anti-cheat (all original words kept, target not hidden / transparent / collapsed), and a pixel regression check.
- **Tests** (`bench/tests/`): an adversarial cheat test of the grader and an offline audit of past runs.
- **SAM localisation spike** (`param/sam_spike/`) run on an A100.
- Cost logging (`results/cost.jsonl`), summarisers (`bench/summarize*.py`).

Not built: an adapter for running other people's agents against the bench (planned, not done), and no SAM in the loop.

## Third-party data (not our code)
Two real bugs come from daisyUI (MIT) and four more from Pico CSS (MIT). They are replayed at the commit just before each upstream fix and keep their own licenses; each bug's `meta.json` records the upstream PR, base commit and fix commit. Build helpers clone these repos into `bench/_work/` (git-ignored). More candidates we tried and could not reproduce are listed in `bench/REPRO-STATUS.md`.

## Related work
SWE-bench Multimodal (arXiv 2410.03859), Seeing is Fixing (2506.16136), VisualRepair (2607.14075). This is not the first visual-repair benchmark. What it adds is a cheap, runnable bench with a hidden grader, an anti-cheat check and a regression check.

## Reproduce
```
bun install                                   # playwright, pngjs, sass (uses your installed Google Chrome)
node bench/seeded/validate.mjs                # all 28 seeded bugs fail on buggy / pass on clean -> "valid 28/28"
python bench/summarize.py heldout             # recompute the tables from the committed results/
python bench/summarize-real.py                # real-bug table
node bench/tests/adversarial.mjs              # grader cheat test -> 0 holes
```
Re-running the agent needs a Baseten key: copy `.env.example` to `.env`, then `node agent/seeded-run.mjs vision --split heldout --runs 3` (reasoning effort is set to low; the model needs a large `max_tokens`). Real-bug runs: `node agent/real-run.mjs vision --runs 3` after building the upstream-fix reference CSS with `bench/tools/build-pico.sh` (see `bench/REPRO-STATUS.md`).

## Seeded bench results (Muse Spark Open, reasoning_effort=low)
28 visual bugs on a demo app (19 dev / 9 held-out). Held-out split, 3 runs per bug, up to 2 attempts; the agent self-verifies from its own screenshot or DOM.

| Config | strict fixed (oracle + no cheat + no regression) | oracle pass only |
|---|---|---|
| vision (screenshot + source) | 24/27 = 89% (95% CI 72-96%) | 27/27 |
| dom (DOM/layout snapshot + source) | 23/27 = 85% (68-94%) | 26/27 |
| hybrid (both) | 24/27 = 89% (72-96%) | 26/27 |

Dev split (1 run): vision 18/19, dom 15/19, hybrid 16/19 (`results/SUMMARY.txt`).

**Honest reading:** the three configs are statistically indistinguishable on these seeded web bugs. Adding DOM data did not beat vision alone.

Limitations:
- Seeded bugs are authored by us; they say little about real-world fix rate.
- The regression metric (pixels changed outside the target region) flags valid alternative fixes that shift layout, e.g. a different `clamp()` for a heading, which is why "oracle pass only" is shown next to the strict number. It was not changed after seeing held-out results.
- Bench v2 amendments (a latent bug in our clean app, anti-cheat, thresholds) were made after the first dev run and before any held-out run, and are listed in `bench/REPRO-STATUS.md`. The anti-cheat was tightened further (v2.1) after the held-out run, after an adversarial test found 6 grader holes; an offline audit shows none of the 120 recorded fixes used those tricks, so no reported number changed.

## Real upstream bugs (Pico CSS), 4 bugs x 3 runs x 3 configs
The agent sees the buggy page and is given only a LIST of the library's SCSS files; it picks which to open, edits the SCSS, rebuilds and self-verifies. A separate oracle (never shown to the model) grades the final build; the maintainers' merged fix is used only to measure how close the result is.

| Config | fixed (oracle pass + content kept + edit applied) |
|---|---|
| vision | 12/12 = 100% (95% CI 76-100%) |
| hybrid (screenshot + DOM) | 10/12 = 83% (55-95%) |
| dom (DOM/computed-style only) | 5/12 = 42% (19-68%) |

pico-585 (striped table + `[hidden]` row) was fixed by every config; pico-474 (spinner is a `::before`) and pico-615 (details nested in a dropdown) were never fixed by dom-only; vision fixed all four. Fixed patches differ from the maintainers' fix by 0.00-0.40% of pixels on the test page.

Read this carefully:
- **Possible memorisation.** These are public bugs from a public repo; the model may have seen the fixes, and the near-identical patches are consistent with that. The seeded suite is the cleaner test; the real bugs show it works on real code, not that it generalises.
- **Two of four oracles (pico-528, pico-615) are computed-style checks**, weaker than pixel evidence. pico-474 and pico-585 show visible differences (`bench/bugs/*/out/`).
- n = 4 bugs; intervals are wide. The vision-vs-hybrid gap is not significant; vision-vs-dom is suggestive, not conclusive.
- The first run failed for tooling reasons (whitespace-sensitive edit matching, and a shared git checkout that raced between configs). Both were fixed before any kept result; the discarded runs are in `results/_tooling-v1-exact-match` and `results/_discarded-real-race`.
- On real bugs the DOM snapshot did not help; on seeded bugs all configs were equal.

## SAM localisation spike (negative result)
Pre-registered before running (`docs/BUILD-PLAN.md`): given a buggy screenshot and the plain name of the affected element, does SAM box the right element (IoU >= 0.5 against the DOM box)? Bar to join the agent loop: 60%. Run on an A100 (PARAM Siddhi-AI) with SAM 3 (`facebook/sam3`, transformers): **4/28 = 14%**. SAM returned no box for 23 of 28 pages (modal dialogs, tables, nav bars, inputs); its 4 hits (button, image, heading) were precise (IoU 0.87-0.99). SAM 3.1 was not tested. A labelled-exploratory, post hoc rerun with lower score cutoffs reached 12/28 (43%) at 0.1, still below the bar and generous (any extra box may hit), so 14% is the headline. Raw outputs: `results/sam/`.

## Secrets
Keys live in a local `.env` (git-ignored); see `.env.example`. The repository history contains no keys.
