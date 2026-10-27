"""Draw the README charts as standalone SVGs (dark card, readable on GitHub light and dark themes).
Numbers come from video/src/stats.json (written by video/tools/stats.py from results/) and results/sam/*.json. Run from repo root:
    python video/tools/stats.py && python docs/tools/make_charts.py
"""
import json, html
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "docs" / "media"
st = json.loads((ROOT / "video/src/stats.json").read_text(encoding="utf8"))
sam2 = json.loads((ROOT / "results/sam/spike2-exploratory.json").read_text(encoding="utf8"))

BG, PANEL, LINE, TEXT, MUTED = "#0b0f17", "#121826", "#273245", "#f2f5fa", "#8f9bb0"
CYAN, CYAN2, GREY, GREEN, RED, AMBER = "#22d3ee", "#7be8f8", "#6d7a93", "#4ade80", "#fb7185", "#fbbf24"
FONT = "'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
MONO = "'JetBrains Mono', 'SFMono-Regular', Consolas, monospace"
e = html.escape


def svg(w, h, body, title):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img" aria-label="{e(title)}">'
            f'<title>{e(title)}</title><rect width="{w}" height="{h}" rx="18" fill="{BG}"/>{body}</svg>')


def text(x, y, s, size=18, fill=TEXT, weight=400, mono=False, anchor="start"):
    return f'<text x="{x}" y="{y}" font-family="{MONO if mono else FONT}" font-size="{size}" font-weight="{weight}" fill="{fill}" text-anchor="{anchor}">{e(str(s))}</text>'


def bar(x, y, w, r, color, label, bw=340):
    """One bar row: label, track, filled bar, CI whisker, 'k/n = p%'."""
    out = [text(x, y + 20, label, 17, color, 700, True)]
    bx = x + 110
    out.append(f'<rect x="{bx}" y="{y}" width="{bw}" height="28" rx="14" fill="{PANEL}" stroke="{LINE}"/>')
    out.append(f'<rect x="{bx}" y="{y}" width="{max(6, bw * r["pct"] / 100)}" height="28" rx="14" fill="{color}" opacity="0.92"/>')
    cx1, cx2 = bx + bw * r["lo"] / 100, bx + bw * r["hi"] / 100
    out.append(f'<line x1="{cx1}" y1="{y + 14}" x2="{cx2}" y2="{y + 14}" stroke="{TEXT}" stroke-width="3" opacity="0.9"/>')
    out.append(f'<line x1="{cx1}" y1="{y + 7}" x2="{cx1}" y2="{y + 21}" stroke="{TEXT}" stroke-width="3"/><line x1="{cx2}" y1="{y + 7}" x2="{cx2}" y2="{y + 21}" stroke="{TEXT}" stroke-width="3"/>')
    out.append(text(bx + bw + 16, y + 20, f'{r["k"]}/{r["n"]} = {r["pct"]}%', 17, TEXT, 600, True))
    out.append(text(bx + bw + 16, y + 40, f'95% CI {r["lo"]}-{r["hi"]}%', 13, MUTED, 400, True))
    return "".join(out)


# 1. results ----------------------------------------------------------------------------------------------------------------
def results():
    s, r, m = st["seeded"], st["real"], st["meta"]
    body = [text(40, 52, "Fix rate with 95% confidence intervals (whisker = interval)", 24, TEXT, 800),
            text(40, 80, "Strict grading: hidden oracle + anti-cheat + no regression. Same grader for every row.", 15, MUTED)]
    panels = [("Seeded bugs, held-out split", "9 bugs x 3 runs per config", [("vision", s["vision"], CYAN), ("hybrid", s["hybrid"], CYAN2), ("dom", s["dom"], GREY), ("Meta API", m["seeded"], AMBER)], 120),
              ("Real upstream bugs (Pico CSS)", "4 bugs x 3 runs per config", [("vision", r["vision"], CYAN), ("hybrid", r["hybrid"], CYAN2), ("dom", r["dom"], GREY), ("Meta API", m["real"], AMBER)], 452)]
    for title, sub, rows, y0 in panels:
        body += [text(40, y0, title, 21, TEXT, 700), text(40, y0 + 24, sub, 14, MUTED, 400, True)]
        for i, (lab, rr, col) in enumerate(rows):
            body.append(bar(40, y0 + 50 + i * 58, 0, rr, col, lab))
    body.append(text(40, 770, "vision / hybrid / dom: Muse Spark Open (open weights, Baseten). Meta API: muse-wonder-1.0, vision config only.", 14, MUTED, 400, True))
    return svg(900, 800, "".join(body), "Fix rates by configuration with confidence intervals")


# 2. self-check waffle ------------------------------------------------------------------------------------------------------
def selfcheck():
    real, seeded = st["selfcheck"]["real"], st["selfcheck"]["seeded"]
    body = [text(40, 54, f'{real["wrongPct"]}% of the agent\'s "fixed" claims on real bugs were wrong', 26, TEXT, 800),
            text(40, 82, f'{real["wrong"]} of {real["claims"]} claims; checked against a hidden grader the model never sees', 15, MUTED)]
    x0, y0, sz, gap, per = 40, 118, 42, 8, 15
    for i in range(real["claims"]):
        c = RED if i < real["wrong"] else GREEN
        body.append(f'<rect x="{x0 + (i % per) * (sz + gap)}" y="{y0 + (i // per) * (sz + gap)}" width="{sz}" height="{sz}" rx="9" fill="{c}"/>')
    yb = y0 + 2 * (sz + gap) + 22
    body += [text(40, yb, "Seeded bugs (author-made): wrong claims", 16, MUTED), text(40, yb + 32, f'{seeded["wrong"]} of {seeded["claims"]} = {seeded["wrongPct"]}%', 24, GREEN, 700, True),
             text(520, yb, "Real bugs: wrong claims", 16, MUTED), text(520, yb + 32, f'{real["wrong"]} of {real["claims"]} = {real["wrongPct"]}%', 24, RED, 700, True),
             text(40, yb + 70, f'It also said "not fixed" when the grader passed it {real["pessimistic"]} times (the subtle spinner bug).', 15, MUTED)]
    return svg(860, yb + 100, "".join(body), "Agent self-check versus grader")


# 3. SAM -----------------------------------------------------------------------------------------------------------------
def sam():
    n = st["sam"]["n"]
    rows = [("0.5 (pre-registered)", st["sam"]["hits"], AMBER)] + [(f"{th} (post hoc)", v["hits"], GREY) for th, v in sam2["exploratory_post_hoc"]["summary"].items()]
    body = [text(40, 52, "SAM 3 as a UI-element localiser: 14% vs a 60% bar set in advance", 24, TEXT, 800),
            text(40, 80, f"{n} buggy screenshots; hit = predicted box overlaps the DOM element with IoU >= 0.5. 'score cutoff' = SAM confidence threshold.", 14, MUTED)]
    bx, bw, y0 = 330, 440, 118
    for i, (lab, hits, col) in enumerate(rows):
        y = y0 + i * 52
        body += [text(40, y + 20, f"cutoff {lab}", 14, col if col != GREY else MUTED, 600, True),
                 f'<rect x="{bx}" y="{y}" width="{bw}" height="28" rx="14" fill="{PANEL}" stroke="{LINE}"/>',
                 f'<rect x="{bx}" y="{y}" width="{max(6, bw * hits / n)}" height="28" rx="14" fill="{col}" opacity="0.92"/>',
                 text(bx + bw + 16, y + 20, f"{hits}/{n} = {round(100 * hits / n)}%", 15, TEXT, 600, True)]
    xl = bx + bw * 0.6
    body += [f'<line x1="{xl}" y1="{y0 - 14}" x2="{xl}" y2="{y0 + len(rows) * 52 - 10}" stroke="{GREEN}" stroke-width="3" stroke-dasharray="7 6"/>',
             text(xl, y0 - 20, "60% bar", 14, GREEN, 700, True, "middle"),
             text(40, y0 + len(rows) * 52 + 18, "Result: SAM stays out of the agent. It returned no box at all for 23 of 28 screenshots at the pre-registered cutoff.", 15, MUTED)]
    return svg(960, y0 + len(rows) * 52 + 50, "".join(body), "SAM 3 localisation hit rate at several cutoffs")


for name, fn in (("chart-results.svg", results), ("chart-selfcheck.svg", selfcheck), ("chart-sam.svg", sam)):
    (OUT / name).write_text(fn(), encoding="utf8")
    print("wrote", OUT / name)
