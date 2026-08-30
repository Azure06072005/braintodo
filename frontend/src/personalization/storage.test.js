import { describe, it, expect, beforeEach } from "vitest";
import {
  sanitizeSettings,
  readStoredSettings,
  writeStoredSettings,
  STORAGE_KEY,
} from "./storage";
import { DEFAULT_PERSONALIZATION } from "./presets";

describe("personalization storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("sanitizeSettings", () => {
    it("returns default settings for null or non-object input", () => {
      expect(sanitizeSettings(null)).toEqual(DEFAULT_PERSONALIZATION);
      expect(sanitizeSettings(undefined)).toEqual(DEFAULT_PERSONALIZATION);
      expect(sanitizeSettings("string")).toEqual(DEFAULT_PERSONALIZATION);
    });

    it("preserves valid settings and clamps glowIntensity", () => {
      const valid = {
        palette: "aurora",
        starDensity: "high",
        glowIntensity: 0.7,
        showCometTrail: false,
      };
      expect(sanitizeSettings(valid)).toEqual(valid);

      expect(sanitizeSettings({ ...valid, glowIntensity: 1.5 }).glowIntensity).toBe(1);
      expect(sanitizeSettings({ ...valid, glowIntensity: -0.2 }).glowIntensity).toBe(0);
    });

    it("falls back to defaults for unknown/invalid fields", () => {
      const corrupted = {
        palette: "invalid_palette",
        starDensity: "invalid_density",
        glowIntensity: "not_a_number",
        showCometTrail: "not_a_boolean",
      };
      expect(sanitizeSettings(corrupted)).toEqual(DEFAULT_PERSONALIZATION);
    });
  });

  describe("readStoredSettings & writeStoredSettings", () => {
    it("reads default settings when nothing is in localStorage", () => {
      expect(readStoredSettings()).toEqual(DEFAULT_PERSONALIZATION);
    });

    it("writes and reads back valid settings", () => {
      const custom = {
        palette: "solar",
        starDensity: "low",
        glowIntensity: 0.5,
        showCometTrail: false,
      };
      writeStoredSettings(custom);
      expect(readStoredSettings()).toEqual(custom);
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).toEqual(custom);
    });

    it("falls back gracefully when localStorage contains malformed JSON", () => {
      localStorage.setItem(STORAGE_KEY, "{bad_json:");
      expect(readStoredSettings()).toEqual(DEFAULT_PERSONALIZATION);
    });
  });
});
