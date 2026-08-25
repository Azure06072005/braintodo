import { useCallback, useMemo, useState } from "react";
import { I18nContext } from "./context";
import { SUPPORTED_LOCALES, STORAGE_KEY, readStoredLocale, translate } from "./translations";

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(readStoredLocale);

  const setLocale = useCallback((next) => {
    if (!SUPPORTED_LOCALES.includes(next)) return;
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore write failures (e.g. privacy mode / storage full).
    }
  }, []);

  const t = useCallback((key, params) => translate(locale, key, params), [locale]);

  const value = useMemo(
    () => ({ locale, setLocale, t, supportedLocales: SUPPORTED_LOCALES }),
    [locale, setLocale, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
