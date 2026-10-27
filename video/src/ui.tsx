import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, Loop, OffthreadVideo, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, display, mono, s } from "./theme";

/** Spring-in from `at` seconds (relative to the current Sequence). */
export const useIn = (at: number, damping = 14) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - s(at), fps, config: { damping, stiffness: 140, mass: 0.7 } });
};

export const Pop: React.FC<{ at: number; children: React.ReactNode; from?: "up" | "left" | "scale"; style?: React.CSSProperties }> = ({ at, children, from = "up", style }) => {
  const p = useIn(at);
  const t = from === "left" ? `translateX(${interpolate(p, [0, 1], [-60, 0])}px)` : from === "scale" ? `scale(${interpolate(p, [0, 1], [0.6, 1])})` : `translateY(${interpolate(p, [0, 1], [40, 0])}px)`;
  return <div style={{ opacity: Math.min(1, p * 1.4), transform: t, ...style }}>{children}</div>;
};

/** Slams in big then settles: for the punchy lines. */
export const Slam: React.FC<{ at: number; children: React.ReactNode; size?: number; color?: string; style?: React.CSSProperties }> = ({ at, children, size = 120, color = C.text, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - s(at), fps, config: { damping: 11, stiffness: 220, mass: 0.6 } });
  return (
    <div style={{ fontFamily: display, fontWeight: 800, fontSize: size, lineHeight: 0.95, letterSpacing: "-0.03em", color, opacity: p > 0.01 ? 1 : 0, transform: `scale(${interpolate(p, [0, 1], [2.4, 1])})`, filter: `blur(${interpolate(p, [0, 0.6, 1], [14, 2, 0])}px)`, ...style }}>
      {children}
    </div>
  );
};

export const Bg: React.FC = () => {
  const frame = useCurrentFrame();
  const a = interpolate(frame % 600, [0, 600], [0, 360]);
  return <AbsoluteFill style={{ background: `linear-gradient(${135 + Math.sin((a * Math.PI) / 180) * 8}deg, ${C.bg} 0%, ${C.bg2} 55%, ${C.bg} 100%)` }} />;
};

export const Kicker: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = C.accent }) => (
  <div style={{ fontFamily: mono, fontSize: 22, letterSpacing: "0.14em", textTransform: "uppercase", color, fontWeight: 700 }}>{children}</div>
);

export const H: React.FC<{ children: React.ReactNode; size?: number; style?: React.CSSProperties }> = ({ children, size = 64, style }) => (
  <div style={{ fontFamily: display, fontWeight: 800, fontSize: size, lineHeight: 1.02, letterSpacing: "-0.025em", color: C.text, ...style }}>{children}</div>
);

export const P: React.FC<{ children: React.ReactNode; size?: number; style?: React.CSSProperties }> = ({ children, size = 30, style }) => (
  <div style={{ fontFamily: display, fontWeight: 400, fontSize: size, lineHeight: 1.3, color: C.muted, ...style }}>{children}</div>
);

export const Chip: React.FC<{ children: React.ReactNode; color?: string; bg?: string; size?: number; border?: string; style?: React.CSSProperties }> = ({ children, color = C.text, bg = C.panel, size = 28, border = C.line, style }) => (
  <div style={{ display: "inline-flex", alignItems: "center", gap: 12, padding: "14px 22px", borderRadius: 16, background: bg, border: `1.5px solid ${border}`, fontFamily: display, fontWeight: 600, fontSize: size, color, ...style }}>{children}</div>
);

/** Typewriter code / log panel. Each line: {t, c?}. */
export const Code: React.FC<{ lines: { t: string; c?: string }[]; at: number; step?: number; size?: number; style?: React.CSSProperties }> = ({ lines, at, step = 0.35, size = 24, style }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ fontFamily: mono, fontSize: size, lineHeight: 1.55, background: "#0a0d13", border: `1.5px solid ${C.line}`, borderRadius: 18, padding: "22px 26px", color: C.text, whiteSpace: "pre", overflow: "hidden", ...style }}>
      {lines.map((l, i) => {
        const start = s(at + i * step);
        const n = Math.max(0, Math.min(l.t.length, Math.floor((frame - start) * 2.6)));
        return (
          <div key={i} style={{ color: l.c ?? C.text, minHeight: size * 1.55 }}>
            {l.t.slice(0, n)}
            {n > 0 && n < l.t.length ? <span style={{ color: C.accent }}>▍</span> : null}
          </div>
        );
      })}
    </div>
  );
};

/** Browser window around real recordings or stills. */
export const Browser: React.FC<{ clip?: string; img?: string; width: number; label?: string; labelColor?: string; url?: string; ratio?: number; pos?: string; zoom?: number; origin?: string; shift?: string }> = ({ clip, img, width, label, labelColor = C.accent, url = "localhost", ratio = 0.4, pos = "center", zoom = 1, origin = "0 0", shift = "translate(0px, 0px)" }) => {
  const h = width * ratio;
  return (
    <div style={{ width, borderRadius: 18, overflow: "hidden", border: `1.5px solid ${C.line}`, background: "#fff", boxShadow: "0 30px 80px rgba(0,0,0,0.55)" }}>
      <div style={{ height: 40, background: "#1b2230", display: "flex", alignItems: "center", gap: 10, padding: "0 16px" }}>
        {["#fb7185", "#fbbf24", "#4ade80"].map((c) => (
          <div key={c} style={{ width: 12, height: 12, borderRadius: 6, background: c }} />
        ))}
        <div style={{ marginLeft: 14, flex: 1, background: "#0e131c", borderRadius: 8, padding: "5px 14px", fontFamily: mono, fontSize: 15, color: C.muted }}>{url}</div>
        {label ? <div style={{ fontFamily: mono, fontSize: 15, fontWeight: 700, color: C.bg, background: labelColor, borderRadius: 999, padding: "4px 12px", letterSpacing: "0.06em" }}>{label}</div> : null}
      </div>
      <div style={{ width, height: h, background: "#fff", overflow: "hidden", position: "relative" }}>
        <div style={{ width, height: h, transformOrigin: origin, transform: `scale(${zoom}) ${shift}` }}>
          {clip ? <Loop durationInFrames={s(4.7)}><OffthreadVideo src={staticFile(clip)} muted style={{ width, height: h, objectFit: "cover" }} /></Loop> : null}
          {img ? <Img src={staticFile(img)} style={{ width, height: h, objectFit: "cover", objectPosition: pos }} /> : null}
        </div>
      </div>
    </div>
  );
};

export const Steps: React.FC<{ active: number; left?: number }> = ({ active, left = 110 }) => {
  const names = ["See", "Pick file", "Patch", "Self-check", "Hidden grader"];
  return (
    <div style={{ position: "absolute", left, bottom: 54, display: "flex", gap: 14, alignItems: "center" }}>
      {names.map((n, i) => (
        <React.Fragment key={n}>
          <div style={{ fontFamily: mono, fontSize: 19, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: i === active ? C.bg : i < active ? C.text : C.muted, background: i === active ? C.accent : "transparent", border: `1.5px solid ${i === active ? C.accent : C.line}`, padding: "8px 14px", borderRadius: 10 }}>
            {i + 1} {n}
          </div>
          {i < names.length - 1 ? <div style={{ width: 18, height: 2, background: C.line }} /> : null}
        </React.Fragment>
      ))}
    </div>
  );
};

/** Fade a scene in/out at its edges. */
export const Fade: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const o = interpolate(frame, [0, 6, durationInFrames - 8, durationInFrames], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};

export const ease = Easing.bezier(0.16, 1, 0.3, 1);
