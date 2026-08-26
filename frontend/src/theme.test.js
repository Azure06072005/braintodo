import { describe, expect, it } from "vitest";
import { theme, colorForDepth, seededRandom } from "./theme";

describe("theme (universe theme tokens)", () => {
  it("keeps every pre-existing token so no consumer breaks", () => {
    for (const key of [
      "canvasBg",
      "panelBg",
      "panelBorder",
      "edge",
      "pulse",
      "textPrimary",
      "textSecondary",
      "textMuted",
      "accent",
      "importantRing",
      "depthColors",
      "clusterPalette",
    ]) {
      expect(theme).toHaveProperty(key);
    }
  });

  it("defines the new universe-theme tokens", () => {
    expect(Array.isArray(theme.nebula)).toBe(true);
    expect(theme.nebula.length).toBeGreaterThan(0);
    expect(typeof theme.orbitLine).toBe("string");
    expect(typeof theme.starColor).toBe("string");
    expect(theme.starOpacityMin).toBeLessThan(theme.starOpacityMax);
    expect(typeof theme.cometDashArray).toBe("string");
  });

  it("glow() returns a usable box-shadow/text-shadow string", () => {
    expect(theme.glow("#ff0000")).toBe("0 0 12px #ff0000");
    expect(theme.glow("#00ff00", 20)).toBe("0 0 20px #00ff00");
  });

  it("colorForDepth still cycles through depthColors correctly", () => {
    expect(colorForDepth(0)).toBe(theme.depthColors[0]);
    expect(colorForDepth(theme.depthColors.length)).toBe(theme.depthColors[0]);
  });

  it("seededRandom is deterministic for the same seed", () => {
    expect(seededRandom(42)).toBe(seededRandom(42));
  });

  it("seededRandom produces values in [0, 1)", () => {
    for (let seed = 0; seed < 50; seed++) {
      const v = seededRandom(seed);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("seededRandom varies across different seeds (not a constant)", () => {
    const values = new Set([1, 2, 3, 4, 5].map(seededRandom));
    expect(values.size).toBeGreaterThan(1);
  });
});