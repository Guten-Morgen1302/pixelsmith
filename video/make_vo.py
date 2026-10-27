"""English voice-over for the Pixelsmith demo.

  python make_vo.py --script        # no key needed: writes VOICEOVER.md (scene, start time, max length, text) for you to read aloud
  python make_vo.py                 # Gemini TTS, one wav per line -> out/vo/NN.wav + out/vo/timing.json (needs GEMINI_API_KEY in ../.env)
  python make_vo.py 3 7             # regenerate only lines 3 and 7
  python make_vo.py --check         # transcribe every wav with Gemini and flag lines whose words do not match

Scene start times come from src/timeline.json (the same file that sets scene lengths in the video), so VO and picture cannot drift.
No style prompt is used: this TTS model reads style instructions aloud. Every line must fit its slot (max seconds).
"""
from __future__ import annotations

import json, os, re, subprocess, sys, time, wave
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE / "out" / "vo"
MODEL = os.getenv("VO_MODEL", "gemini-3.8-flash-tts")
VOICE = os.getenv("VO_VOICE", "Fenrir")

TL = json.loads((HERE / "src" / "timeline.json").read_text())
START, DUR, acc = {}, {}, 0.0
for t in TL:
    START[t["id"]], DUR[t["id"]] = acc, t["d"]
    acc += t["d"]

# (scene id, offset into the scene in seconds, max length in seconds, text). Numbers are spelled out for the TTS.
SCRIPT: list[tuple[str, float, float, str]] = [
    ("cold", 0.4, 7.4, "Every coding agent says the same thing: fixed. We checked. On real bugs, twenty-eight percent of those claims were wrong."),
    ("logo", 0.9, 3.3, "This is Pixelsmith."),
    ("problem", 0.3, 8.0, "Visual bugs are slow to fix, and easy to fake. So we built the measurement."),
    ("pipeline", 0.4, 8.0, "Meta's models see the page and patch it. A hidden grader decides."),
    ("realbug", 0.5, 10.0, "A real bug from Pico CSS. The spinner image is eighteen pixels in a forty pixel box. The agent's patch fixes it. Real recordings."),
    ("trace", 0.4, 14.0, "The real run: five calls, real timings. The agent's own check says: not fixed. The hidden grader says: pass, a fraction of a percent from the maintainers' fix."),
    ("grader", 0.4, 14.0, "A cheat: hide the toast. The position check passes, but the words are gone, so the grader refuses. A hundred and forty cheats tried, none accepted."),
    ("results", 0.4, 15.0, "On real bugs, screenshots win: twelve of twelve, against five of twelve for layout data. On seeded bugs they tie. Small samples, wide intervals, and the model may have seen these public fixes."),
    ("metaapi", 0.4, 14.0, "Through the Meta Model API: twenty-two of twenty-seven seeded, ten of twelve real. One catch: it rearranged the page to pass its own check. The grader caught it."),
    ("selfcheck", 0.4, 9.4, "Here is why the grader exists. On real bugs, twenty-eight percent of the agent's fixed claims were wrong. An agent's word is not a measurement."),
    ("sam", 0.4, 13.0, "We also tested Meta's SAM three. We set the bar at sixty percent before running it. It scored fourteen percent. So SAM stays out. A negative result, reported."),
    ("numbers", 0.4, 9.4, "Built this week: twenty-eight seeded bugs, five real ones, over eight hundred calls to Meta models. All in the repo."),
    ("end", 0.5, 7.5, "Pixelsmith-Bench. Measure the fix. Don't trust the fixed. Team consolelog."),
]
LINES = [(START[sid] + off, min(mx, DUR[sid] - off - 0.2), text) for sid, off, mx, text in SCRIPT]


def write_script() -> None:
    rows = ["# Voice-over script (read at a natural pace; each line must finish before its slot ends)", "", "| # | scene | start | max | line |", "|---|---|---|---|---|"]
    for i, ((sid, off, mx, text), (start, mx2, _)) in enumerate(zip(SCRIPT, LINES), 1):
        m, s = divmod(start, 60)
        rows.append(f"| {i:02d} | {sid} | {int(m)}:{s:04.1f} | {mx2:.1f}s | {text} |")
    rows += ["", "Record each line separately or one take; if you record one take, save it as out/vo/full.wav and run mix_audio.py."]
    (HERE / "VOICEOVER.md").write_text("\n".join(rows) + "\n", encoding="utf-8")
    print("wrote VOICEOVER.md")


def _client():
    from dotenv import load_dotenv
    from google import genai
    load_dotenv(HERE.parent / ".env")
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        raise SystemExit("GEMINI_API_KEY is not set in pixelsmith/.env. Use --script and record your own voice, or add the key yourself.")
    return genai.Client(api_key=key)


def tts(client, text: str) -> bytes:
    from google.genai import types
    cfg = types.GenerateContentConfig(response_modalities=["AUDIO"], speech_config=types.SpeechConfig(
        voice_config=types.VoiceConfig(prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=VOICE))))
    for attempt in range(4):
        try:
            r = client.models.generate_content(model=MODEL, contents=text, config=cfg)
            return r.candidates[0].content.parts[0].inline_data.data
        except Exception as e:  # noqa: BLE001 rate limits / transient errors: back off and retry
            print(f"   retry {attempt + 1}: {type(e).__name__}: {str(e)[:120]}")
            time.sleep(6 * (attempt + 1))
    raise SystemExit(f"TTS failed for: {text[:60]}")


def write_wav(path: Path, pcm: bytes) -> float:
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000); w.writeframes(pcm)
    return len(pcm) / 2 / 24000


def trim_and_fit(src: Path, dst: Path, max_s: float) -> float:
    tmp = dst.with_suffix(".trim.wav")
    trim = "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-af", trim, str(tmp)], check=True)
    dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(tmp)]))
    tempo = max(1.0, dur / max_s)
    if tempo > 1.25:
        print(f"   WARNING {dst.name}: {dur:.1f}s for a {max_s:.1f}s slot even at 1.25x; shorten the text")
        tempo = 1.25
    print(f"   natural {dur:.1f}s, speed-up x{tempo:.2f} for a {max_s:.1f}s slot")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(tmp), "-af", f"atempo={tempo:.3f}", "-ar", "44100", str(dst)], check=True)
    tmp.unlink()
    return dur / tempo


def norm(t: str) -> list[str]:
    return re.findall(r"[a-z0-9']+", t.lower())


def check() -> None:
    from google.genai import types
    client = _client()
    bad = []
    for i, (_, _, text) in enumerate(LINES, 1):
        wav = OUT / f"{i:02d}.wav"
        if not wav.exists():
            continue
        r = client.models.generate_content(model=os.getenv("VO_STT_MODEL", "gemini-3.8-flash"), contents=[
            "Transcribe this audio exactly. Reply with the transcript only.", types.Part.from_bytes(data=wav.read_bytes(), mime_type="audio/wav")])
        got, want = set(norm(r.text)), set(norm(text))
        miss = want - got
        print(f"{i:02d} {'OK ' if len(miss) <= 2 else 'BAD'} missing={sorted(miss)[:6]}")
        if len(miss) > 2:
            bad.append(i)
    print("regenerate with: python make_vo.py", *bad if bad else ["(none needed)"])


def main(only: set[int]) -> None:
    from google.genai import types  # noqa: F401  (fail early if the SDK is missing)
    OUT.mkdir(parents=True, exist_ok=True)
    client = _client()
    timing_path = OUT / "timing.json"
    timing = json.loads(timing_path.read_text()) if timing_path.exists() else {}
    for i, (start, max_s, text) in enumerate(LINES, 1):
        if only and i not in only:
            continue
        raw, final = OUT / f"{i:02d}.raw.wav", OUT / f"{i:02d}.wav"
        print(f"{i:02d} @ {start:6.1f}s  {text[:70]}")
        write_wav(raw, tts(client, text))
        dur = trim_and_fit(raw, final, max_s)
        raw.unlink()
        timing[f"{i:02d}"] = {"start": round(start, 2), "dur": round(dur, 2), "max": round(max_s, 2)}
        print(f"   -> {dur:.1f}s (slot {max_s:.1f}s)")
    timing_path.write_text(json.dumps(timing, indent=1))


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    args = sys.argv[1:]
    if "--script" in args:
        write_script()
    elif "--check" in args:
        check()
    else:
        main({int(a) for a in args})
