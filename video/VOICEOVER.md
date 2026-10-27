# Voice-over script (read at a natural pace; each line must finish before its slot ends)

| # | scene | start | max | line |
|---|---|---|---|---|
| 01 | cold | 0:00.4 | 7.4s | Every coding agent says the same thing: fixed. We checked. On real bugs, twenty-eight percent of those claims were wrong. |
| 02 | logo | 0:08.9 | 3.3s | This is Pixelsmith. |
| 03 | problem | 0:12.8 | 8.0s | Visual bugs are slow to fix, and easy to fake. So we built the measurement. |
| 04 | pipeline | 0:21.4 | 7.9s | Meta's models see the page and patch it. A hidden grader decides. |
| 05 | realbug | 0:30.0 | 10.0s | A real bug from Pico CSS. The spinner image is eighteen pixels in a forty pixel box. The agent's patch fixes it. Real recordings. |
| 06 | trace | 0:40.9 | 13.9s | The real run: five calls, real timings. The agent's own check says: not fixed. The hidden grader says: pass, a fraction of a percent from the maintainers' fix. |
| 07 | grader | 0:55.4 | 13.9s | A cheat: hide the toast. The position check passes, but the words are gone, so the grader refuses. A hundred and forty cheats tried, none accepted. |
| 08 | results | 1:09.9 | 14.9s | On real bugs, screenshots win: twelve of twelve, against five of twelve for layout data. On seeded bugs they tie. Small samples, wide intervals, and the model may have seen these public fixes. |
| 09 | metaapi | 1:25.4 | 14.0s | Through the Meta Model API: twenty-two of twenty-seven seeded, ten of twelve real. One catch: it rearranged the page to pass its own check. The grader caught it. |
| 10 | selfcheck | 1:40.4 | 9.4s | Here is why the grader exists. On real bugs, twenty-eight percent of the agent's fixed claims were wrong. An agent's word is not a measurement. |
| 11 | sam | 1:50.4 | 12.9s | We also tested Meta's SAM three. We set the bar at sixty percent before running it. It scored fourteen percent. So SAM stays out. A negative result, reported. |
| 12 | numbers | 2:03.9 | 9.4s | Built this week: twenty-eight seeded bugs, five real ones, over eight hundred calls to Meta models. All in the repo. |
| 13 | end | 2:14.0 | 7.5s | Pixelsmith-Bench. Measure the fix. Don't trust the fixed. Team consolelog. |

Record each line separately or one take; if you record one take, save it as out/vo/full.wav and run mix_audio.py.
