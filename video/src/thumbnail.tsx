import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { Bg } from "./ui";
import { C, display, mono } from "./theme";
import stats from "./stats.json";

/** 1280x720. Big headline, two real tilted screenshots (buggy vs agent fix), one accent badge. */
export const Thumbnail: React.FC = () => (
  <AbsoluteFill>
    <Bg />
    <div style={{ position: "absolute", left: 60, top: 70, width: 640 }}>
      <div style={{ fontFamily: display, fontWeight: 800, fontSize: 138, lineHeight: 0.92, letterSpacing: "-0.04em", color: C.text }}>
        “Fixed.”
        <br />
        <span style={{ color: C.red }}>Was it?</span>
      </div>
      <div style={{ marginTop: 30, fontFamily: mono, fontWeight: 700, fontSize: 30, color: C.accent, letterSpacing: "0.04em" }}>PIXELSMITH-BENCH</div>
    </div>
    <div style={{ position: "absolute", right: 40, top: 70, transform: "rotate(5deg)", width: 600, border: `4px solid ${C.red}`, borderRadius: 18, overflow: "hidden", boxShadow: "0 30px 80px rgba(0,0,0,0.6)" }}>
      <div style={{ width: 600, height: 250, overflow: "hidden", position: "relative" }}><Img src={staticFile("img/spinner-buggy.png")} style={{ position: "absolute", width: 1140, left: -110, top: -40 }} /></div>
    </div>
    <div style={{ position: "absolute", right: 130, top: 330, transform: "rotate(-4deg)", width: 600, border: `4px solid ${C.green}`, borderRadius: 18, overflow: "hidden", boxShadow: "0 30px 80px rgba(0,0,0,0.6)" }}>
      <div style={{ width: 600, height: 250, overflow: "hidden", position: "relative" }}><Img src={staticFile("img/spinner-fixed.png")} style={{ position: "absolute", width: 1140, left: -110, top: -40 }} /></div>
    </div>
    <div style={{ position: "absolute", left: 60, bottom: 56, background: C.accent, color: C.bg, fontFamily: display, fontWeight: 800, fontSize: 40, padding: "12px 26px", borderRadius: 14 }}>
      {stats.selfcheck.real.wrongPct}% of “fixed” claims were wrong
    </div>
  </AbsoluteFill>
);
