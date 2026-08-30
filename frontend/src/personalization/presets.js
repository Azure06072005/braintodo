/**
 * Preset definitions for FE023 (node/edge/background personalization).
 * Pure data - no React, no side effects - so this stays trivially testable
 * and importable from anywhere (Starfield, GraphCanvas, the settings panel)
 * without pulling in the context machinery.
 */

export const PALETTE_PRESETS = {
  nebula: {
    label: "Tinh vân",
    nebula: ["#7f77dd", "#4a9fd8", "#c25b9e", "#1d9e75"],
    accent: "#7f77dd",
  },
  aurora: {
    label: "Cực quang",
    nebula: ["#1d9e75", "#4ad8c2", "#7fdd9e", "#2f9ee5"],
    accent: "#1d9e75",
  },
  solar: {
    label: "Mặt trời",
    nebula: ["#e59a2f", "#d85a30", "#e5c22f", "#dd7f5a"],
    accent: "#e59a2f",
  },
};

// Star counts intentionally match Starfield.jsx's pre-personalization
// hardcoded LAYERS constant exactly for "medium" - so the default
// personalization settings reproduce today's exact visual output with zero
// regression for anyone who never opens the settings panel.
export const STAR_DENSITY_OPTIONS = {
  low: { label: "Thưa", nearCount: 45, farCount: 25 },
  medium: { label: "Vừa", nearCount: 90, farCount: 50 },
  high: { label: "Dày", nearCount: 160, farCount: 90 },
};

export const DEFAULT_PERSONALIZATION = {
  palette: "nebula",
  starDensity: "medium",
  // 0 = no glow filter applied at all (today's exact behavior); 1 = strongest.
  glowIntensity: 0,
  // Matches the pulse dots' current always-on behavior exactly.
  showCometTrail: true,
};

export function isValidPalette(value) {
  return Object.prototype.hasOwnProperty.call(PALETTE_PRESETS, value);
}

export function isValidStarDensity(value) {
  return Object.prototype.hasOwnProperty.call(STAR_DENSITY_OPTIONS, value);
}