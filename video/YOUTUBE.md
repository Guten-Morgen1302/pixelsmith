# YouTube / submission text

**Title:** Pixelsmith-Bench: an AI agent says "fixed". Was it? (Meta Muse Spark Open, open weights)

**Description:**

Every coding agent says "fixed". On real bugs, 8 of 29 of those claims from our agent were wrong. Pixelsmith-Bench fixes visual UI bugs with Meta's open-weights Muse Spark Open, then checks every fix with a hidden grader the model never sees: an oracle, an anti-cheat check, and a pixel-regression check.

What is in the video, all from real runs in the repo:
- A real upstream bug (Pico CSS #474) recorded in Chrome: the buggy build vs the agent's own patch
- The real agent run: five model calls with real timings, the real SCSS diff, the agent's own (wrong) self-check vs the grader
- A cheat (hide the element) that passes the position check and is refused by the grader: 140 cheat attempts, 0 accepted
- Results with 95% confidence intervals: seeded bugs (held-out split) and real Pico bugs, vision vs DOM vs hybrid
- Meta's SAM 3 as a localiser: pre-registered bar 60%, scored 14%, so it stays out (a negative result)

Honest caveats (also in the README): public bugs may have been seen by the model, two of the four real-bug oracles are computed-style checks, n is small, SAM 3 not 3.1, and no Meta Model API key was used (the model was served by Baseten).

Code and every number: https://github.com/Guten-Morgen1302/pixelsmith
Team consolelog, Indie track, Meta Global AI Developer Hackathon.
Voice-over: AI-generated (Gemini TTS). Music: synthesized with ffmpeg.

**Chapters:**
0:00 Every agent says "fixed"
0:12 The problem
0:21 How it works
0:29 A real bug, recorded
0:40 The real agent run
0:55 The grader refuses a cheat
1:09 Results with confidence intervals
1:25 Why the grader exists
1:35 SAM 3: a pre-registered negative result
1:48 Built this week
1:58 Pixelsmith-Bench

**Tags:** Meta, Muse Spark Open, open weights, AI agents, benchmark, CSS, visual bugs, hackathon, Playwright, Baseten

**Before posting:** the repo link only works once the repository is public. Voice is AI-generated; swap in your own recording if you prefer (see video/README.md).
