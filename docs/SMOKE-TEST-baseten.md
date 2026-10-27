# Smoke test: Muse Spark Open on Baseten (2026-10-27)

Model `meta-models/muse-spark-open-1026`, OpenAI-compatible endpoint, auth header `Authorization: Api-Key <key>`.

| Test | Result |
|---|---|
| Text call ("reply ok") | HTTP 200, 2.3 s, 199 tokens total (36 reasoning) |
| Vision call, daisyUI #4724 buggy screenshot (2.4 KB PNG) | HTTP 200, 11.2 s, 285 prompt + 2199 completion tokens, of which 2117 reasoning |
| Same call with max_tokens=1500 | `content: null`: all 1500 tokens went to reasoning, finish_reason length. **Use max_tokens >= 6000 or the answer is empty.** |

Vision answer on the buggy screenshot: said the focus ring on "Home" is clipped on its LEFT side (correct: the oracle measured 4 px clipped on the left). It returned a bounding box [12,18,26,62]; ground truth from the oracle is about [20,28,24,60]. The box contains the defect (IoU about 0.2): right defect and side, loose localisation. That is exactly the gap a segmentation model (SAM 3.1) or the DOM path would close.

Implications:
- The model reads screenshots and finds the right defect, so the vision-only config is viable.
- It always reasons: ~2k reasoning tokens per call. Budget latency (~10 s) and tokens accordingly; a 30-bug x 3-config x 3-run bench is about 270+ calls, roughly 45 min sequential at 10 s each.
- Price per token not yet read from the Baseten dashboard; check usage there before large runs (credits: $100).
- n=1 per test; not a measurement of accuracy yet.
