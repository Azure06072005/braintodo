export const theme = {
  // Deepened toward a true space-black for the universe theme (was a
  // plain dark gray before) - kept as the same keys so every existing
  // consumer (TopBar, GraphCanvas, forms, pages, ...) picks this up for
  // free with zero code changes on their end.
  canvasBg: "#05070f",
  panelBg: "#0d1020",
  panelBorder: "#22263a",
  edge: "#3a3d56",
  pulse: "#d4537e",
  textPrimary: "#e5e4dd",
  textSecondary: "#9c9a92",
  textMuted: "#6b6a64",
  accent: "#7f77dd",
  importantRing: "#e59a2f",

  depthColors: ["#7f77dd", "#1d9e75", "#d85a30", "#e59a2f"],

  clusterPalette: ["#7f77dd", "#1d9e75", "#d85a30", "#e59a2f", "#4a9fd8", "#c25b9e"],

  // --- Universe theme tokens (FE022) ---
  // Soft radial nebula tints used behind the app content (see Starfield.jsx).
  // Kept low-saturation/low-opacity by convention wherever they're used, so
  // they read as atmosphere rather than competing with foreground content.
  nebula: ["#7f77dd", "#4a9fd8", "#c25b9e", "#1d9e75"],
  // Faint line color for decorative orbit rings/ellipses.
  orbitLine: "rgba(127, 119, 221, 0.18)",
  // Star color/opacity range used by the twinkling starfield canvas.
  starColor: "#e5e4dd",
  starOpacityMin: 0.15,
  starOpacityMax: 0.85,
  // Glow tokens for node/accent highlighting (box-shadow / text-shadow),
  // reused by FE023's personalization layer and FE025's 3D graph.
  glow: (color, strength = 12) => `0 0 ${strength}px ${color}`,
  // Animated dashed "comet trail" edge style, for FE023's edge
  // personalization - a CSS stroke-dasharray/animation convention, not a
  // color, so it lives here as a shared constant rather than duplicated
  // per-component.
  cometDashArray: "4 6",
};

export function colorForDepth(depth) {
  return theme.depthColors[depth % theme.depthColors.length];
}

/** Deterministic pseudo-random in [0, 1) from an integer seed - used by
 * Starfield to place stars consistently across renders without pulling in
 * a random-number-generator dependency, and without actual Math.random()
 * (which would make the starfield's test output non-deterministic). */
export function seededRandom(seed) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}