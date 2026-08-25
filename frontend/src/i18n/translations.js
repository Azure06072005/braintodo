import vi from "../locales/vi.json";
import en from "../locales/en.json";
import ja from "../locales/ja.json";

export const LOCALES = { vi, en, ja };
export const SUPPORTED_LOCALES = Object.keys(LOCALES);
export const DEFAULT_LOCALE = "vi"; // matches the app's pre-i18n hardcoded language
export const STORAGE_KEY = "bt-locale";

export function lookup(dict, key) {
  return key.split(".").reduce((node, part) => (node == null ? undefined : node[part]), dict);
}

export function interpolate(template, params) {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match
  );
}

export function translate(locale, key, params) {
  const dict = LOCALES[locale] ?? LOCALES[DEFAULT_LOCALE];
  const raw = lookup(dict, key) ?? lookup(LOCALES[DEFAULT_LOCALE], key) ?? key;
  return interpolate(raw, params);
}

export function readStoredLocale() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return SUPPORTED_LOCALES.includes(stored) ? stored : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}
