import React from "react";
import { AbsoluteFill, Composition, Series } from "remotion";
import { Cold, End, Grader, Logo, Numbers, Pipeline, Problem, RealBug, MetaApi, Results, Sam, SelfCheck, Trace } from "./scenes";
import { FPS, s } from "./theme";
import { Thumbnail } from "./thumbnail";
import timeline from "./timeline.json";

const COMPONENTS: Record<string, React.FC> = {
  cold: Cold, logo: Logo, problem: Problem, pipeline: Pipeline, realbug: RealBug, trace: Trace,
  grader: Grader, results: Results, metaapi: MetaApi, selfcheck: SelfCheck, sam: Sam, numbers: Numbers, end: End,
};

// Single source of truth for scene length: src/timeline.json (also read by make_vo.py).
const SCENES = timeline.map((t) => ({ C: COMPONENTS[t.id], d: s(t.d) }));
export const TOTAL = SCENES.reduce((a, b) => a + b.d, 0);

const Main: React.FC = () => (
  <AbsoluteFill style={{ background: "#090b10" }}>
    <Series>
      {SCENES.map(({ C, d }, i) => (
        <Series.Sequence key={i} durationInFrames={d}>
          <C />
        </Series.Sequence>
      ))}
    </Series>
  </AbsoluteFill>
);

export const Root: React.FC = () => (
  <>
    <Composition id="Pixelsmith" component={Main} durationInFrames={TOTAL} fps={FPS} width={1920} height={1080} />
    <Composition id="Thumbnail" component={Thumbnail} durationInFrames={1} fps={FPS} width={1280} height={720} />
  </>
);
