# Pixelsmith-Bench

An open, runnable way to measure and fix visual bugs in web UIs, built on Meta models for the Meta Global AI Developer Hackathon (team consolelog, Indie track).

> Status: work in progress. Nothing below is claimed until it is measured.

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
