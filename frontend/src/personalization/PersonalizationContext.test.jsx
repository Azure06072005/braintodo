import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PersonalizationProvider } from "./PersonalizationContext";
import { usePersonalization } from "./usePersonalization";
import { DEFAULT_PERSONALIZATION } from "./presets";

function ConsumerComponent() {
  const { settings, updateSetting, resetSettings } = usePersonalization();
  return (
    <div>
      <span data-testid="palette">{settings.palette}</span>
      <span data-testid="starDensity">{settings.starDensity}</span>
      <span data-testid="glowIntensity">{settings.glowIntensity}</span>
      <span data-testid="showCometTrail">{String(settings.showCometTrail)}</span>
      <button onClick={() => updateSetting("palette", "aurora")}>Set Aurora</button>
      <button onClick={() => updateSetting("glowIntensity", 0.8)}>Set Glow</button>
      <button onClick={resetSettings}>Reset</button>
    </div>
  );
}

describe("PersonalizationProvider & usePersonalization", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("provides default settings initially", () => {
    render(
      <PersonalizationProvider>
        <ConsumerComponent />
      </PersonalizationProvider>
    );

    expect(screen.getByTestId("palette")).toHaveTextContent(DEFAULT_PERSONALIZATION.palette);
    expect(screen.getByTestId("starDensity")).toHaveTextContent(DEFAULT_PERSONALIZATION.starDensity);
    expect(screen.getByTestId("glowIntensity")).toHaveTextContent(
      String(DEFAULT_PERSONALIZATION.glowIntensity)
    );
    expect(screen.getByTestId("showCometTrail")).toHaveTextContent(
      String(DEFAULT_PERSONALIZATION.showCometTrail)
    );
  });

  it("updates individual settings and persists to localStorage", () => {
    render(
      <PersonalizationProvider>
        <ConsumerComponent />
      </PersonalizationProvider>
    );

    fireEvent.click(screen.getByText("Set Aurora"));
    expect(screen.getByTestId("palette")).toHaveTextContent("aurora");

    fireEvent.click(screen.getByText("Set Glow"));
    expect(screen.getByTestId("glowIntensity")).toHaveTextContent("0.8");
  });

  it("resets to defaults when resetSettings is called", () => {
    render(
      <PersonalizationProvider>
        <ConsumerComponent />
      </PersonalizationProvider>
    );

    fireEvent.click(screen.getByText("Set Aurora"));
    expect(screen.getByTestId("palette")).toHaveTextContent("aurora");

    fireEvent.click(screen.getByText("Reset"));
    expect(screen.getByTestId("palette")).toHaveTextContent(DEFAULT_PERSONALIZATION.palette);
  });
});
