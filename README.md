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
- Seeded bugs are authored by us; they say little about real-world fix rate. Real bugs: 1 reproduced so far (`bench/bugs/daisyui-4724`), 3 tried and not reproducible (`bench/REPRO-STATUS.md`).
- The regression metric (pixels changed outside the target region) flags valid alternative fixes that shift layout below the target (e.g. a different `clamp()` for a heading). That is why "oracle pass only" is reported next to the strict number. The metric was not changed after seeing held-out results.
- Bench v2 amendments (clean-app bug, anti-cheat, thresholds) were made after the first dev run and before any held-out run; they are listed in `bench/REPRO-STATUS.md`. Tag `bench-v2-frozen`.
- SAM 3.1 is not in the loop yet (not served on Baseten).
