import React from "react";
import { AbsoluteFill, Img, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Bg, Browser, Chip, Code, Fade, H, Kicker, P, Pop, Slam, Steps, useIn } from "./ui";
import { C, display, mono, s } from "./theme";
import stats from "./stats.json";
import trace from "./trace.json";
import sam from "./sam.json";

const fmt = (n: number) => `${Math.round(n)}`;
const pxPct = ((trace.grade.pixelsDifferFromUpstreamFix as number) * 100).toFixed(2);

/* ───────────────────────── 1. Cold open: everybody says "fixed" ───────────────────────── */
const CLAIMS = ["Fixed ✓", "Done ✓", "LGTM ✓", "Bug resolved ✓", "All good ✓", "Patched ✓", "Looks fixed ✓", "Ship it ✓"];
export const Cold: React.FC = () => {
  const frame = useCurrentFrame();
  const freeze = s(3.8);
  const f = Math.min(frame, freeze);
  const dim = interpolate(frame, [freeze, freeze + 10], [1, 0.14], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Bg />
      <AbsoluteFill style={{ opacity: dim }}>
        {Array.from({ length: 64 }).map((_, i) => {
          const born = i * 1.7;
          if (f < born) return null;
          const x = 60 + random(`x${i}`) * 1640;
          const y = 1080 - (f - born) * 8.5 - random(`y${i}`) * 90;
          const p = Math.min(1, (f - born) / 5);
          return (
            <div key={i} style={{ position: "absolute", left: x, top: y, opacity: p, transform: `scale(${0.6 + p * 0.4}) rotate(${(random(`r${i}`) - 0.5) * 8}deg)`, fontFamily: display, fontWeight: 700, fontSize: 34 + random(`s${i}`) * 18, color: C.bg, background: C.green, padding: "12px 24px", borderRadius: "22px 22px 22px 6px", whiteSpace: "nowrap" }}>
              {CLAIMS[i % CLAIMS.length]}
            </div>
          );
        })}
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: 14 }}>
        <Slam at={3.9} size={150}>Every agent says “fixed.”</Slam>
        <Slam at={4.9} size={150} color={C.red}>Is it?</Slam>
        <Pop at={6.1} style={{ marginTop: 26 }}>
          <div style={{ fontFamily: mono, fontSize: 25, color: C.muted, textAlign: "center", lineHeight: 1.5 }}>
            Muse Spark Open on 4 real bugs: <span style={{ color: C.red, fontWeight: 700 }}>{stats.selfcheck.real.wrong} of its {stats.selfcheck.real.claims} “fixed” claims were wrong.</span>
            <br />
            A hidden grader checked.
          </div>
        </Pop>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ───────────────────────── 2. Logo: the spinner becomes the wordmark ───────────────────────── */
export const Logo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ring = spring({ frame, fps, config: { damping: 12, stiffness: 110 } });
  const grow = spring({ frame: frame - 14, fps, config: { damping: 14 } });
  const letters = "Pixelsmith".split("");
  return (
    <Fade>
      <Bg />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ position: "absolute", width: interpolate(ring, [0, 1], [900, 120]), height: interpolate(ring, [0, 1], [900, 120]), borderRadius: "50%", border: `${interpolate(ring, [0, 1], [2, 14])}px solid ${C.accent}`, borderRightColor: "transparent", transform: `rotate(${frame * 14}deg)`, opacity: interpolate(grow, [0, 1], [1, 0]) }} />
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <div style={{ width: 96 * grow, height: 96 * grow, borderRadius: "50%", border: `12px solid ${C.accent}`, borderRightColor: "transparent", transform: `rotate(${frame * 10}deg)` }} />
          <div style={{ display: "flex" }}>
            {letters.map((ch, i) => {
              const p = spring({ frame: frame - 16 - i * 2, fps, config: { damping: 12 } });
              return (
                <span key={i} style={{ fontFamily: display, fontWeight: 800, fontSize: 190, letterSpacing: "-0.04em", color: i >= 5 ? C.accent : C.text, opacity: p, transform: `translateY(${interpolate(p, [0, 1], [80, 0])}px)` }}>
                  {ch}
                </span>
              );
            })}
          </div>
        </div>
        <Pop at={1.7} style={{ position: "absolute", bottom: 330 }}>
          <Kicker>Fix visual bugs · measure the fix · trust nothing</Kicker>
        </Pop>
      </AbsoluteFill>
    </Fade>
  );
};

/* ───────────────────────── 3. Problem ───────────────────────── */
export const Problem: React.FC = () => (
  <Fade>
    <Bg />
    <AbsoluteFill style={{ padding: "110px 150px", justifyContent: "center", gap: 34 }}>
      <Pop at={0.1}><Kicker>The problem</Kicker></Pop>
      <Pop at={0.3}><H size={92}>Visual bugs are slow to fix<br />and <span style={{ color: C.accent }}>easy to fake.</span></H></Pop>
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginTop: 8 }}>
        {["see it", "find the CSS", "edit", "reload", "check by eye"].map((t, i) => (
          <Pop key={t} at={1.6 + i * 0.35} from="scale"><Chip size={30}>{i + 1} · {t}</Chip></Pop>
        ))}
      </div>
      <Pop at={4.2}><P size={40} style={{ maxWidth: 1300 }}>An agent that says “fixed” might have hidden the element, broken a neighbour, or fixed nothing. Nobody measures that.</P></Pop>
      <Pop at={6.2}><H size={54} style={{ color: C.accent }}>So we built the measurement.</H></Pop>
    </AbsoluteFill>
  </Fade>
);

/* ───────────────────────── 4. Pipeline ───────────────────────── */
export const Pipeline: React.FC = () => {
  const nodes = [
    { t: "Screenshot", sub: "of the running page", c: C.text },
    { t: "Muse Spark Open", sub: "open weights · via Baseten", c: C.accent },
    { t: "Patch the source", sub: "SCSS / CSS edit", c: C.text },
    { t: "Rebuild + self-check", sub: "the agent's own verdict", c: C.amber },
    { t: "Hidden grader", sub: "never shown to the model", c: C.green },
  ];
  return (
    <Fade>
      <Bg />
      <AbsoluteFill style={{ padding: "100px 110px", gap: 40 }}>
        <Pop at={0.1}><Kicker>How it works</Kicker></Pop>
        <Pop at={0.3}><H size={76}>The agent edits. <span style={{ color: C.green }}>A separate grader judges.</span></H></Pop>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 40 }}>
          {nodes.map((n, i) => (
            <React.Fragment key={n.t}>
              <Pop at={1.2 + i * 0.5} from="scale">
                <div style={{ width: 282, minHeight: 190, background: C.panel, border: `2px solid ${n.c === C.text ? C.line : n.c}`, borderRadius: 22, padding: "26px 22px", boxShadow: n.c === C.text ? "none" : `0 0 40px ${n.c}22` }}>
                  <div style={{ fontFamily: mono, fontSize: 17, color: C.muted, letterSpacing: "0.1em" }}>{`0${i + 1}`}</div>
                  <div style={{ fontFamily: display, fontWeight: 800, fontSize: 36, lineHeight: 1.05, color: n.c, marginTop: 10 }}>{n.t}</div>
                  <div style={{ fontFamily: display, fontSize: 22, color: C.muted, marginTop: 12 }}>{n.sub}</div>
                </div>
              </Pop>
              {i < nodes.length - 1 ? <Pop at={1.5 + i * 0.5}><div style={{ fontFamily: mono, fontSize: 40, color: C.accent }}>→</div></Pop> : null}
            </React.Fragment>
          ))}
        </div>
        <Pop at={4.6}><P size={34}>Three configs compared: <b style={{ color: C.text }}>vision</b> (screenshot) · <b style={{ color: C.text }}>dom</b> (layout data) · <b style={{ color: C.text }}>hybrid</b> (both).</P></Pop>
      </AbsoluteFill>
    </Fade>
  );
};

/* ───────────────────────── 5. A real bug, recorded ───────────────────────── */
export const RealBug: React.FC = () => (
  <Fade>
    <Bg />
    <AbsoluteFill style={{ padding: "70px 80px" }}>
      <Pop at={0.1}><Kicker>A real upstream bug · picocss/pico #474</Kicker></Pop>
      <Pop at={0.3}><H size={64} style={{ marginTop: 8 }}>The loading spinner is a <span style={{ color: C.red }}>tiny arc</span>.</H></Pop>
      <div style={{ display: "flex", gap: 44, marginTop: 40, justifyContent: "center" }}>
        <Pop at={0.8} from="left">
          <Browser clip="clips/spinner-buggy.mp4" width={820} zoom={2.1} shift="translate(-70px, -22px)" label="BUGGY BUILD" labelColor={C.red} url="pico @ commit before the fix" />
          <div style={{ fontFamily: mono, fontSize: 22, color: C.red, marginTop: 18 }}>image is {trace.oracle.buggy.bg}px inside a {trace.oracle.buggy.box}px box</div>
        </Pop>
        <Pop at={2.6}>
          <Browser clip="clips/spinner-fixed.mp4" width={820} zoom={2.1} shift="translate(-70px, -22px)" label="AGENT'S FIX" labelColor={C.green} url="same page, agent's patch" />
          <div style={{ fontFamily: mono, fontSize: 22, color: C.green, marginTop: 18 }}>image is {trace.oracle.fixed.bg}px inside a {trace.oracle.fixed.box}px box</div>
        </Pop>
      </div>
      <Pop at={5}><div style={{ fontFamily: mono, fontSize: 21, color: C.muted, marginTop: 34, textAlign: "center" }}>Both clips recorded from real builds in Chrome, unedited. Left: the commit just before the maintainers' fix. Right: the agent's own patch.</div></Pop>
    </AbsoluteFill>
  </Fade>
);

/* ───────────────────────── 6. The real agent run ───────────────────────── */
const interesting = (l: string) => /background-size|min-width|min-height|position|transform/.test(l) && l.trim().length > 1;
export const Trace: React.FC = () => {
  const diff = trace.diffLines.filter(interesting).slice(0, 7).map((l) => ({ t: (l.length > 62 ? l.slice(0, 61) + "…" : l), c: l.startsWith("+") ? C.green : C.red }));
  const files = trace.pick.files.map((f: string) => ({ t: "open  " + f, c: C.text }));
  const labels: Record<string, string> = { pick: "pick files", patch1: "patch #1", verify1: "self-check #1", patch2: "patch #2", verify2: "self-check #2" };
  const maxMs = Math.max(...trace.calls.map((c) => c.ms));
  const check = trace.attempts[trace.attempts.length - 1];
  return (
    <Fade>
      <Bg />
      <AbsoluteFill style={{ padding: "64px 90px" }}>
        <Pop at={0.1}><Kicker>The real run · results/real/vision/run1/pico-474.json</Kicker></Pop>
        <div style={{ display: "flex", gap: 56, marginTop: 28 }}>
          <div style={{ width: 640 }}>
            <Pop at={0.4}><H size={52}>Five model calls.<br /><span style={{ color: C.accent }}>Real timings.</span></H></Pop>
            <div style={{ marginTop: 30, display: "grid", gap: 16 }}>
              {trace.calls.map((c, i) => (
                <Pop key={c.tag} at={1 + i * 0.5}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ width: 190, fontFamily: mono, fontSize: 21, color: C.muted }}>{labels[c.tag] ?? c.tag}</div>
                    <div style={{ height: 22, width: 330 * (c.ms / maxMs), borderRadius: 11, background: c.tag.startsWith("verify") ? C.amber : C.accent }} />
                    <div style={{ fontFamily: mono, fontSize: 21, color: C.text }}>{(c.ms / 1000).toFixed(1)}s</div>
                  </div>
                </Pop>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, display: "grid", gap: 20 }}>
            <Code at={1.2} step={0.4} size={22} lines={[...files, { t: "" }, ...diff]} />
            <Pop at={7.6}>
              <div style={{ background: C.panel, border: `2px solid ${C.amber}`, borderRadius: 20, padding: "20px 26px" }}>
                <div style={{ fontFamily: mono, fontSize: 19, color: C.amber, letterSpacing: "0.1em" }}>AGENT'S OWN CHECK</div>
                <div style={{ fontFamily: display, fontWeight: 800, fontSize: 40, color: C.amber, marginTop: 6 }}>“Not fixed.” <span style={{ fontSize: 24, fontWeight: 400, color: C.muted }}>({check.selfReason?.slice(0, 74)}…)</span></div>
              </div>
            </Pop>
            <Pop at={10}>
              <div style={{ background: C.panel, border: `2px solid ${C.green}`, borderRadius: 20, padding: "20px 26px" }}>
                <div style={{ fontFamily: mono, fontSize: 19, color: C.green, letterSpacing: "0.1em" }}>HIDDEN GRADER</div>
                <div style={{ fontFamily: display, fontWeight: 800, fontSize: 40, color: C.green, marginTop: 6 }}>PASS ✓ <span style={{ fontSize: 24, fontWeight: 400, color: C.muted }}>{pxPct}% of pixels differ from the maintainers' real fix</span></div>
              </div>
            </Pop>
          </div>
        </div>
      </AbsoluteFill>
      <Steps active={Math.min(4, Math.floor(useCurrentFrame() / s(2.8)))} left={90} />
    </Fade>
  );
};

/* ───────────────────────── 7. The grader refuses a cheat ───────────────────────── */
const Verdict: React.FC<{ ok: boolean; label: string }> = ({ ok, label }) => (
  <div style={{ display: "flex", gap: 12, alignItems: "center", fontFamily: mono, fontSize: 22, color: ok ? C.green : C.red }}>
    <span style={{ width: 26 }}>{ok ? "✓" : "✗"}</span>
    <span style={{ color: C.text }}>{label}</span>
  </div>
);
export const Grader: React.FC = () => {
  const ch = trace.cheat;
  const cols = [
    { img: "img/toast-buggy.png", tag: "THE BUG", color: C.red, v: ch.buggy, fixed: false, note: "toast pushed off screen" },
    { img: "img/toast-honest.png", tag: "AN HONEST FIX", color: C.green, v: ch.honest ?? ch.buggy, fixed: true, note: "agent's real patch" },
    { img: "img/toast-cheat.png", tag: "A CHEAT", color: C.amber, v: ch.cheat, fixed: false, note: "display:none" },
  ];
  return (
    <Fade>
      <Bg />
      <AbsoluteFill style={{ padding: "64px 80px" }}>
        <Pop at={0.1}><Kicker>The grader · seeded bug “overflow-toast-offscreen”</Kicker></Pop>
        <Pop at={0.3}><H size={64} style={{ marginTop: 8 }}>Hiding the bug is not <span style={{ color: C.green }}>fixing</span> it.</H></Pop>
        <div style={{ display: "flex", gap: 34, marginTop: 34 }}>
          {cols.map((c, i) => (
            <Pop key={c.tag} at={1 + i * 1.1} style={{ width: 560 }}>
              <div style={{ fontFamily: mono, fontWeight: 700, fontSize: 21, color: c.color, letterSpacing: "0.1em", marginBottom: 12 }}>{c.tag} <span style={{ color: C.muted, fontWeight: 400 }}>· {c.note}</span></div>
              <Browser img={c.img} width={560} ratio={0.5} pos="right bottom" zoom={2.4} origin="100% 100%" />
              <div style={{ marginTop: 18, display: "grid", gap: 8 }}>
                <Verdict ok={c.v.oraclePass} label="oracle: toast fully on screen" />
                <Verdict ok={c.v.wordsKept} label="anti-cheat: all original words kept" />
                <Verdict ok={!c.v.neutralised} label="anti-cheat: element not neutralised" />
                <div style={{ fontFamily: display, fontWeight: 800, fontSize: 38, color: c.fixed ? C.green : C.red, marginTop: 6 }}>{c.fixed ? "FIXED" : "NOT FIXED"}</div>
              </div>
            </Pop>
          ))}
        </div>
        <Pop at={6.4} style={{ position: "absolute", left: 80, right: 80, bottom: 58 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
            <Chip size={34} color={C.green} border={C.green}>{stats.adversarial.tests} cheat attempts → {stats.adversarial.holes} accepted</Chip>
            <P size={26}>Our first run of this test found 6 holes in our own grader. We fixed them and re-ran. Nothing here is left unchecked.</P>
          </div>
        </Pop>
      </AbsoluteFill>
    </Fade>
  );
};

/* ───────────────────────── 8. Results ───────────────────────── */
type R = { k: number; n: number; pct: number; lo: number; hi: number };
const Bars: React.FC<{ title: string; sub: string; rows: [string, R, string][]; at: number }> = ({ title, sub, rows, at }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ flex: 1 }}>
      <Pop at={at}>
        <div style={{ fontFamily: display, fontWeight: 800, fontSize: 38, color: C.text }}>{title}</div>
        <div style={{ fontFamily: mono, fontSize: 19, color: C.muted, marginTop: 4 }}>{sub}</div>
      </Pop>
      <div style={{ marginTop: 28, display: "grid", gap: 26 }}>
        {rows.map(([name, r, col], i) => {
          const p = spring({ frame: frame - s(at + 0.6 + i * 0.5), fps, config: { damping: 18 } });
          const W = 620;
          return (
            <div key={name} style={{ opacity: p > 0.02 ? 1 : 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: mono, fontSize: 22, color: C.text, marginBottom: 8 }}>
                <span style={{ color: col, fontWeight: 700 }}>{name}</span>
                <span>{r.k}/{r.n} = {r.pct}%</span>
              </div>
              <div style={{ position: "relative", height: 34, background: C.panel, borderRadius: 17, width: W, border: `1.5px solid ${C.line}` }}>
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: (W * r.pct * p) / 100, background: col, borderRadius: 17, opacity: 0.9 }} />
                <div style={{ position: "absolute", left: (W * r.lo) / 100, width: (W * (r.hi - r.lo)) / 100, top: 15, height: 4, background: C.text, opacity: p }} />
              </div>
              <div style={{ fontFamily: mono, fontSize: 17, color: C.muted, marginTop: 6 }}>95% CI {r.lo}–{r.hi}%</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export const Results: React.FC = () => (
  <Fade>
    <Bg />
    <AbsoluteFill style={{ padding: "64px 100px" }}>
      <Pop at={0.1}><Kicker>Measured · committed in the repo</Kicker></Pop>
      <Pop at={0.3}><H size={64} style={{ marginTop: 8 }}>Screenshots beat layout data <span style={{ color: C.accent }}>on real bugs.</span></H></Pop>
      <div style={{ display: "flex", gap: 90, marginTop: 40 }}>
        <Bars at={1} title="Seeded bugs · held-out" sub="9 bugs × 3 runs per config · strict grading" rows={[["vision", stats.seeded.vision, C.accent], ["hybrid", stats.seeded.hybrid, C.accentSoft], ["dom", stats.seeded.dom, "#6d7a93"]]} />
        <Bars at={4.5} title="Real bugs · Pico CSS" sub="4 bugs × 3 runs per config · agent finds the file itself" rows={[["vision", stats.real.vision, C.accent], ["hybrid", stats.real.hybrid, C.accentSoft], ["dom", stats.real.dom, "#6d7a93"]]} />
      </div>
      <Pop at={9.5}><P size={27} style={{ marginTop: 30, maxWidth: 1500 }}>On seeded bugs the three configs are statistically tied. On real bugs vision {stats.real.vision.k}/{stats.real.vision.n} vs dom {stats.real.dom.k}/{stats.real.dom.n}: suggestive, not conclusive (n = 4 bugs). Public bugs: the model may have seen the fixes.</P></Pop>
    </AbsoluteFill>
  </Fade>
);

/* ───────────────────────── 9. Self-check vs grader ───────────────────────── */
export const SelfCheck: React.FC = () => {
  const real = stats.selfcheck.real, seeded = stats.selfcheck.seeded;
  return (
    <Fade>
      <Bg />
      <AbsoluteFill style={{ padding: "80px 120px", justifyContent: "center", gap: 28 }}>
        <Pop at={0.1}><Kicker>Why the grader exists</Kicker></Pop>
        <div style={{ display: "flex", alignItems: "baseline", gap: 40 }}>
          <Slam at={0.5} size={260} color={C.red}>{real.wrongPct}%</Slam>
          <Pop at={1.2}><H size={54}>of the agent's “fixed” claims on real bugs<br />were wrong ({real.wrong} of {real.claims}).</H></Pop>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", maxWidth: 1500 }}>
          {Array.from({ length: real.claims }).map((_, i) => (
            <Pop key={i} at={2 + i * 0.05} from="scale"><div style={{ width: 38, height: 38, borderRadius: 10, background: i < real.wrong ? C.red : C.green }} /></Pop>
          ))}
        </div>
        <Pop at={4.6}><P size={32}>On our seeded bugs the claim was wrong {seeded.wrong} of {seeded.claims} times ({seeded.wrongPct}%). And on the subtle spinner bug it also said “not fixed” when the grader passed it ({real.pessimistic} times).</P></Pop>
        <Pop at={7}><H size={50} style={{ color: C.accent }}>An agent's word is not a measurement.</H></Pop>
      </AbsoluteFill>
    </Fade>
  );
};

/* ───────────────────────── 10. SAM: a pre-registered negative result ───────────────────────── */
const Overlay: React.FC<{ d: typeof sam.hit; w: number; at: number; ok: boolean }> = ({ d, w, at, ok }) => {
  const k = w / d.w, h = d.h * k;
  const p = useIn(at);
  return (
    <div style={{ position: "relative", width: w, height: h, borderRadius: 14, overflow: "hidden", border: `1.5px solid ${C.line}` }}>
      <Img src={staticFile(`img/sam-${d.id}.png`)} style={{ width: w, height: h }} />
      {d.gt.map((b: number[], i: number) => (
        <div key={"g" + i} style={{ position: "absolute", left: b[0] * k, top: b[1] * k, width: (b[2] - b[0]) * k, height: (b[3] - b[1]) * k, border: `3px dashed ${ok ? C.amber : C.red}`, opacity: p }} />
      ))}
      {d.pred.map((b: number[], i: number) => (
        <div key={"p" + i} style={{ position: "absolute", left: b[0] * k, top: b[1] * k, width: (b[2] - b[0]) * k, height: (b[3] - b[1]) * k, border: `4px solid ${C.green}`, opacity: p }} />
      ))}
    </div>
  );
};
export const Sam: React.FC = () => {
  const bar = 60;
  return (
    <Fade>
      <Bg />
      <AbsoluteFill style={{ padding: "60px 90px" }}>
        <Pop at={0.1}><Kicker>Meta's SAM 3 · pre-registered test · A100 GPU</Kicker></Pop>
        <Pop at={0.3}><H size={60} style={{ marginTop: 8 }}>We set the bar at {bar}% <span style={{ color: C.muted }}>before</span> we ran it.</H></Pop>
        <div style={{ display: "flex", gap: 56, marginTop: 30, alignItems: "flex-start" }}>
          <Pop at={1.2}>
            <Overlay d={sam.hit} w={560} at={1.6} ok />
            <div style={{ fontFamily: mono, fontSize: 21, color: C.green, marginTop: 14 }}>“{sam.hit.phrase}” → box found, IoU {sam.hit.iou.toFixed(2)}</div>
          </Pop>
          <Pop at={3}>
            <Overlay d={sam.miss} w={285} at={3.4} ok={false} />
            <div style={{ fontFamily: mono, fontSize: 21, color: C.red, marginTop: 14 }}>“{sam.miss.phrase}” → no box</div>
          </Pop>
          <div style={{ flex: 1 }}>
            <Slam at={4.6} size={170} color={C.red}>{stats.sam.hits}/{stats.sam.n}</Slam>
            <Pop at={5.2}><H size={44} style={{ marginTop: 6 }}>= {stats.sam.pct}%. Bar was {bar}%.</H></Pop>
            <Pop at={6.4}><P size={30} style={{ marginTop: 22 }}>SAM returned no box at all for {stats.sam.noBox} of {stats.sam.n} screenshots. When it did, it was precise.</P></Pop>
            <Pop at={8.2}><H size={46} style={{ marginTop: 22, color: C.accent }}>So SAM stays out of the agent.</H></Pop>
            <Pop at={9.6}><div style={{ fontFamily: mono, fontSize: 19, color: C.muted, marginTop: 18, lineHeight: 1.5 }}>Post hoc, lower cutoffs: best {stats.sam.best}/{stats.sam.n}. Still under the bar. SAM 3, not 3.1.</div></Pop>
          </div>
        </div>
      </AbsoluteFill>
    </Fade>
  );
};

/* ───────────────────────── 11. Numbers ───────────────────────── */
export const Numbers: React.FC = () => {
  const items: [string, string][] = [
    [fmt(stats.seededBugs), "seeded bugs, 7 classes"],
    [fmt(stats.realBugs), "real upstream bugs reproduced"],
    [`${stats.adversarial.tests}→${stats.adversarial.holes}`, "cheats tried → accepted"],
    [fmt(stats.calls), "Muse Spark Open calls"],
  ];
  return (
    <Fade>
      <Bg />
      <AbsoluteFill style={{ padding: "90px 120px", gap: 40 }}>
        <Pop at={0.1}><Kicker>Built this week</Kicker></Pop>
        <div style={{ display: "flex", gap: 24 }}>
          {items.map(([n, l], i) => (
            <Pop key={l} at={0.6 + i * 0.4} from="scale">
              <div style={{ width: 400, background: C.panel, border: `1.5px solid ${C.line}`, borderRadius: 22, padding: "30px 28px" }}>
                <div style={{ fontFamily: display, fontWeight: 800, fontSize: 96, color: C.accent, letterSpacing: "-0.03em" }}>{n}</div>
                <div style={{ fontFamily: display, fontSize: 28, color: C.muted, marginTop: 6 }}>{l}</div>
              </div>
            </Pop>
          ))}
        </div>
        <Pop at={2.6}>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {["Muse Spark Open (Meta, open weights)", "Baseten inference", "SAM 3 on an A100", "Playwright + Chrome", "Remotion"].map((t) => (
              <Chip key={t} size={26}>{t}</Chip>
            ))}
          </div>
        </Pop>
        <Pop at={4}><P size={30} style={{ maxWidth: 1500 }}>New this week, in the repo: the bench harness, the agent, the grader and its tests. Third-party, used as data only: Pico CSS and daisyUI bugs (MIT).</P></Pop>
        <Pop at={6.4}><P size={26}>No Meta Model API key was used. No card needed. Everything is reproducible from the repo.</P></Pop>
      </AbsoluteFill>
    </Fade>
  );
};

/* ───────────────────────── 12. End card ───────────────────────── */
export const End: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Fade>
      <Bg />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: 22 }}>
        <div style={{ width: 120, height: 120, borderRadius: "50%", border: `14px solid ${C.accent}`, borderRightColor: "transparent", transform: `rotate(${frame * 10}deg)` }} />
        <Slam at={0.3} size={150}>Pixelsmith<span style={{ color: C.accent }}>-Bench</span></Slam>
        <Pop at={1.3}><H size={46} style={{ color: C.muted }}>Measure the fix. Don't trust the “fixed.”</H></Pop>
        <Pop at={2.4}><div style={{ fontFamily: mono, fontSize: 38, fontWeight: 700, color: C.text, background: C.panel, border: `2px solid ${C.accent}`, borderRadius: 18, padding: "18px 34px" }}>github.com/Guten-Morgen1302/pixelsmith</div></Pop>
        <Pop at={3.4}><P size={28}>Team consolelog · Indie track · Meta Global AI Developer Hackathon</P></Pop>
      </AbsoluteFill>
    </Fade>
  );
};
