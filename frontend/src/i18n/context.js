import { createContext } from "react";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, translate } from "./translations";

function makeDefaultContextValue() {
  return {
    locale: DEFAULT_LOCALE,
    setLocale: () => {},
    t: (key, params) => translate(DEFAULT_LOCALE, key, params),
    supportedLocales: SUPPORTED_LOCALES,
  };
}

export const I18nContext = createContext(makeDefaultContextValue());
