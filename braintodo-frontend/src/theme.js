export const theme = {
  canvasBg: "#0b0e14",
  panelBg: "#12151c",
  panelBorder: "#22262f",
  edge: "#3a3d46",
  pulse: "#d4537e",
  textPrimary: "#e5e4dd",
  textSecondary: "#9c9a92",
  textMuted: "#6b6a64",
  accent: "#7f77dd",
  importantRing: "#e59a2f", 

  depthColors: ["#7f77dd", "#1d9e75", "#d85a30", "#e59a2f"],

  clusterPalette: ["#7f77dd", "#1d9e75", "#d85a30", "#e59a2f", "#4a9fd8", "#c25b9e"],

};

export function colorForDepth(depth) {
  return theme.depthColors[depth % theme.depthColors.length];
}