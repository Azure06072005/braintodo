import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Simulates a production build (import.meta.env.DEV === false) for this
// file only. Mocking the small config/env module rather than fighting
// import.meta.env's build-time-substituted mutability directly - see
// config/env.js and Decisions.md (FE026) for why.
vi.mock("../config/env", () => ({ IS_DEV: false }));

import TopBar from "./TopBar";
import { I18nProvider } from "../i18n/I18nContext";

function renderTopBar(props = {}) {
  const defaultProps = {
    source: "live",
    onSourceChange: () => {},
    loading: false,
    error: null,
    realtimeStatus: "disconnected",
    onNewNode: () => {},
    onNewEdge: () => {},
    topologyEnabled: false,
    onToggleTopology: () => {},
    topologyLoading: false,
    clusterOverlayEnabled: false,
    onToggleClusterOverlay: () => {},
    onTogglePanel: () => {},
  };
  return render(
    <I18nProvider>
      <TopBar {...defaultProps} {...props} />
    </I18nProvider>
  );
}

describe("TopBar in a production build (FE026)", () => {
  it("does not render the Mock/Live toggle", () => {
    renderTopBar();
    expect(screen.queryByRole("button", { name: "Mock" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "API thật" })).not.toBeInTheDocument();
  });

  it("still renders every other TopBar control (only the source toggle is gated)", () => {
    renderTopBar({ viewMode: "2d", onViewModeChange: () => {} });
    expect(screen.getByRole("button", { name: "+ Ý tưởng mới" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Độ quan trọng" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2D" })).toBeInTheDocument();
    expect(screen.getByLabelText("Ngôn ngữ")).toBeInTheDocument();
  });
});
