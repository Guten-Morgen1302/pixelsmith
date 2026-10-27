import { loadFont as loadDisplay } from "@remotion/google-fonts/BricolageGrotesque";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

export const display = loadDisplay("normal", { weights: ["400", "600", "800"], subsets: ["latin"] }).fontFamily;
export const mono = loadMono("normal", { weights: ["400", "700"], subsets: ["latin"] }).fontFamily;
export const emoji = '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji"';

export const C = {
  bg: "#090b10",
  bg2: "#10141d",
  panel: "#141a25",
  line: "#273245",
  text: "#f2f5fa",
  muted: "#8f9bb0",
  accent: "#22d3ee", // the one brand accent: spinner cyan
  accentSoft: "#7be8f8",
  green: "#4ade80",
  red: "#fb7185",
  amber: "#fbbf24",
};

export const FPS = 30;
export const s = (seconds: number) => Math.round(seconds * FPS);
