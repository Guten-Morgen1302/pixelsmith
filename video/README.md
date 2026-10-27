# Pixelsmith demo video

Remotion (React) motion graphics around **real** assets: 1920x1080, 30 fps, 2:07. Style adapted from the Plan Bana demo template (dark background, one accent colour, Bricolage Grotesque + JetBrains Mono, spring animations).

```bash
cd video
npm install
python tools/stats.py                  # every number on screen, computed from ../results -> src/stats.json
node tools/make_assets.mjs             # run from ../ (repo root): Chrome recordings + stills + src/trace.json + src/sam.json
npx remotion studio src/index.ts       # preview, scrub
npm run render                         # -> out/pixelsmith-silent.mp4
bash make_music.sh 127                 # synthesized beat -> out/music.wav (ffmpeg only, nothing to license)
python make_vo.py --script             # writes VOICEOVER.md (what to read, and when)
python mix_audio.py                    # -> out/pixelsmith.mp4  (music only, or with voice-over if present)
npm run thumb                          # -> out/thumbnail.png
```
(`tools/stats.py` and `make_assets.mjs` are run from the repo root: `python video/tools/stats.py`, `node video/tools/make_assets.mjs`.)

## Voice-over
The delivered video uses a synthetic voice: Gemini TTS (voice "Fenrir"), 12 lines from `VOICEOVER.md`, each checked by transcribing it back (all numbers spoken correctly; two lines were re-timed or shortened because they overran their scene). Say so when you post it: "AI voice-over".
- **Replace it with your own voice (optional, usually better):** read `VOICEOVER.md`, save one take as `out/vo/full.wav` (delete `out/vo/timing.json` first, because it takes priority), then `python mix_audio.py`.
- **Regenerate:** put `GEMINI_API_KEY=...` in `../.env` yourself, `python make_vo.py` (or `python make_vo.py 4 7` for single lines), `python make_vo.py --check`, `python mix_audio.py`.
- Final mix: music ducked under the voice, loudnorm -15 LUFS, final limiter at about -1.4 dBFS, no clipping (verified by decoding the audio).

## Honesty rules (what is real and what is drawn)
- The two browser panels in "A real bug" are screen recordings of real Chrome pages: the Pico build at the commit before the fix, and the build with the agent's own final patch. Unedited; only upscaled 2x.
- "The real run" uses `results/real/vision/run1/pico-474.json` (files picked, the agent's own words, the grader verdict) and the real per-call timings from `results/cost.jsonl`. The diff is the real SCSS diff. The "agent's own check: not fixed" text is the model's real self-check output, truncated.
- The grader scene shows real screenshots and real verdicts computed by the project's own oracle and anti-cheat code.
- Bars, percentages and intervals come from `python bench/summarize*.py` logic reproduced in `tools/stats.py`; SAM boxes are the real predicted and ground-truth boxes from `results/sam/`.
- Animation only: the cold-open "fixed" bubbles, the logo, and the pipeline diagram. They are not recordings.
- Footnotes on screen state the main caveats (public bugs, small n, SAM 3 not 3.1).

## Not committed
`node_modules/`, `out/`, `public/clips/` (regenerate with `make_assets.mjs`).
