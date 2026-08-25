import { describe, expect, it, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { I18nProvider } from "./I18nContext";
import { useTranslation } from "./useTranslation";
import { SUPPORTED_LOCALES, LOCALES } from "./translations";

function wrapper({ children }) {
  return <I18nProvider>{children}</I18nProvider>;
}

describe("useTranslation", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to Vietnamese, matching the app's pre-i18n hardcoded strings", () => {
    const { result } = renderHook(() => useTranslation(), { wrapper });
    expect(result.current.locale).toBe("vi");
    expect(result.current.t("topbar.new_node")).toBe("+ Ý tưởng mới");
  });

  it("switches language and persists the choice to localStorage", () => {
    const { result } = renderHook(() => useTranslation(), { wrapper });
    act(() => result.current.setLocale("en"));
    expect(result.current.locale).toBe("en");
    expect(result.current.t("topbar.new_node")).toBe("+ New idea");
    expect(localStorage.getItem("bt-locale")).toBe("en");
  });

  it("restores the persisted locale on next mount", () => {
    localStorage.setItem("bt-locale", "ja");
    const { result } = renderHook(() => useTranslation(), { wrapper });
    expect(result.current.locale).toBe("ja");
    expect(result.current.t("topbar.new_node")).toBe("+ 新しいアイデア");
  });

  it("ignores an unsupported locale in localStorage and falls back to the default", () => {
    localStorage.setItem("bt-locale", "fr");
    const { result } = renderHook(() => useTranslation(), { wrapper });
    expect(result.current.locale).toBe("vi");
  });

  it("interpolates {{param}} placeholders", () => {
    const { result } = renderHook(() => useTranslation(), { wrapper });
    const msg = result.current.t("topbar.api_error", { error: "timeout" });
    expect(msg).toContain("timeout");
    expect(msg).not.toContain("{{error}}");
  });

  it("falls back to the raw key for a missing translation instead of throwing", () => {
    const { result } = renderHook(() => useTranslation(), { wrapper });
    expect(result.current.t("nonexistent.key")).toBe("nonexistent.key");
  });

  it("works without a provider (isolated component render), defaulting to vi", () => {
    const { result } = renderHook(() => useTranslation());
    expect(result.current.locale).toBe("vi");
    expect(result.current.t("topbar.new_node")).toBe("+ Ý tưởng mới");
  });

  it("every supported locale defines the same set of keys (no missing translations)", () => {
    function flattenKeys(obj, prefix = "") {
      return Object.entries(obj).flatMap(([k, v]) => {
        const key = prefix ? `${prefix}.${k}` : k;
        return typeof v === "object" && v !== null ? flattenKeys(v, key) : [key];
      });
    }
    const [firstLocale, ...rest] = SUPPORTED_LOCALES;
    const referenceKeys = flattenKeys(LOCALES[firstLocale]).sort();
    for (const locale of rest) {
      expect(flattenKeys(LOCALES[locale]).sort()).toEqual(referenceKeys);
    }
  });
});
