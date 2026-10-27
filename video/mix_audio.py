"""Mix music (+ voice-over if present) onto the silent render.

  python mix_audio.py        -> out/pixelsmith.mp4

Voice sources, first that exists wins:
  1. out/vo/timing.json + out/vo/NN.wav   (make_vo.py, one wav per line, placed by start time)
  2. out/vo/full.wav                       (your own single take, laid over the whole video from t=0)
  3. none: music only (the video is fully readable without sound: all key lines are on screen)
Music is sidechain-ducked under the voice; loudnorm I=-15 TP=-1.5; aac 192k; video stream copied; +faststart.
"""
import json, subprocess
from pathlib import Path

OUT = Path(__file__).resolve().parent / "out"
silent, music, final = OUT / "pixelsmith-silent.mp4", OUT / "music.wav", OUT / "pixelsmith.mp4"
vo_dir = OUT / "vo"
args = ["ffmpeg", "-v", "error", "-y", "-i", str(silent), "-i", str(music)]
if (vo_dir / "timing.json").exists():
    timing = json.loads((vo_dir / "timing.json").read_text())
    keys = sorted(timing)
    for k in keys:
        args += ["-i", str(vo_dir / f"{k}.wav")]
    chains = [f"[{n + 2}:a]aformat=sample_rates=44100:channel_layouts=stereo,adelay={int(timing[k]['start'] * 1000)}|{int(timing[k]['start'] * 1000)}[v{n}]" for n, k in enumerate(keys)]
    vo_in = "".join(f"[v{n}]" for n in range(len(keys)))
    chains += [f"{vo_in}amix=inputs={len(keys)}:normalize=0,volume=1.6,apad[vo]"]
    has_vo = True
elif (vo_dir / "full.wav").exists():
    args += ["-i", str(vo_dir / "full.wav")]
    chains = ["[2:a]aformat=sample_rates=44100:channel_layouts=stereo,volume=1.4,apad[vo]"]
    has_vo = True
else:
    chains, has_vo = [], False
if has_vo:
    chains += [
        "[vo]asplit=2[vo_a][vo_key]",
        "[1:a]aformat=sample_rates=44100:channel_layouts=stereo,volume=0.55[mus]",
        "[mus][vo_key]sidechaincompress=threshold=0.02:ratio=10:attack=15:release=450:makeup=1[ducked]",
        "[ducked][vo_a]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.9,loudnorm=I=-15:TP=-1.5:LRA=9,alimiter=limit=0.7:level=false,aresample=48000,alimiter=limit=0.85:level=false[out]",
    ]
else:
    chains = ["[1:a]aformat=sample_rates=44100:channel_layouts=stereo,volume=0.8,loudnorm=I=-16:TP=-1.5:LRA=9,aresample=48000,alimiter=limit=0.85:level=false[out]"]
args += ["-filter_complex", ";".join(chains), "-map", "0:v", "-map", "[out]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", str(final)]
subprocess.run(args, check=True)
print("wrote", final, "(with voice-over)" if has_vo else "(music only)")
