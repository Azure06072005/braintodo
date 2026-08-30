import { createContext } from "react";
import { DEFAULT_PERSONALIZATION } from "./presets";

function makeDefaultContextValue() {
  return {
    settings: DEFAULT_PERSONALIZATION,
    updateSetting: () => {},
    resetSettings: () => {},
  };
}

export const PersonalizationContext = createContext(makeDefaultContextValue());