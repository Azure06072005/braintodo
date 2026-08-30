import {
  DEFAULT_PERSONALIZATION,
  isValidPalette,
  isValidStarDensity,
} from "./presets";

export const STORAGE_KEY = "bt-personalization";

/** Validates and fills in defaults for anything missing/invalid, so a
 * corrupted or partial localStorage value (or one written by an older app
 * version before a new field existed) never produces broken settings. */
export function sanitizeSettings(raw) {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_PERSONALIZATION };
  return {
    palette: isValidPalette(raw.palette) ? raw.palette : DEFAULT_PERSONALIZATION.palette,
    starDensity: isValidStarDensity(raw.starDensity)
      ? raw.starDensity
      : DEFAULT_PERSONALIZATION.starDensity,
    glowIntensity:
      typeof raw.glowIntensity === "number" && Number.isFinite(raw.glowIntensity)
        ? Math.min(1, Math.max(0, raw.glowIntensity))
        : DEFAULT_PERSONALIZATION.glowIntensity,
    showCometTrail:
      typeof raw.showCometTrail === "boolean"
        ? raw.showCometTrail
        : DEFAULT_PERSONALIZATION.showCometTrail,
  };
}

export function readStoredSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PERSONALIZATION };
    return sanitizeSettings(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_PERSONALIZATION };
  }
}

export function writeStoredSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore write failures (privacy mode / storage full).
  }
}