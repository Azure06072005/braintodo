import { describe, expect, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TopBar from "./TopBar";
import { I18nProvider } from "../i18n/I18nContext";

function renderTopBar(props = {}) {
  const defaultProps = {
    source: "mock",
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

describe("TopBar i18n", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders Vietnamese labels by default", () => {
    renderTopBar();
    expect(screen.getByRole("button", { name: "+ Ý tưởng mới" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Độ quan trọng" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mock" })).toBeInTheDocument();
  });

  it("switches every visible label when the language selector changes", async () => {
    const user = userEvent.setup();
    renderTopBar();
    await user.selectOptions(screen.getByLabelText("Ngôn ngữ"), "en");
    expect(screen.getByRole("button", { name: "+ New idea" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Importance" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Live API" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "+ Ý tưởng mới" })).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Language"), "ja");
    expect(screen.getByRole("button", { name: "+ 新しいアイデア" })).toBeInTheDocument();
  });

  it("interpolates the API error message with the actual error text", () => {
    renderTopBar({ error: "timeout" });
    expect(screen.getByText(/timeout/)).toBeInTheDocument();
    expect(screen.getByText(/Không nối được API thật/)).toBeInTheDocument();
  });
});
