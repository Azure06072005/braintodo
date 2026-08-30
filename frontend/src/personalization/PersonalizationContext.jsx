import { useCallback, useMemo, useState } from "react";
import { PersonalizationContext } from "./context";
import { DEFAULT_PERSONALIZATION } from "./presets";
import { readStoredSettings, writeStoredSettings } from "./storage";

export function PersonalizationProvider({ children }) {
  const [settings, setSettings] = useState(readStoredSettings);

  const updateSetting = useCallback((key, value) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      writeStoredSettings(next);
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_PERSONALIZATION);
    writeStoredSettings(DEFAULT_PERSONALIZATION);
  }, []);

  const value = useMemo(
    () => ({ settings, updateSetting, resetSettings }),
    [settings, updateSetting, resetSettings]
  );

  return (
    <PersonalizationContext.Provider value={value}>{children}</PersonalizationContext.Provider>
  );
}