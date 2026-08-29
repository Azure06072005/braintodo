import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { mockNodes } from "../data/mockData";

// Simulates a production build (import.meta.env.DEV === false) for this
// file only - see config/env.js and Decisions.md (FE026).
vi.mock("../config/env", () => ({ IS_DEV: false }));

vi.mock("../components/GraphCanvas", () => ({
  default: ({ nodes }) => (
    <div data-testid="graph-canvas-stub">
      <span data-testid="node-count">{nodes.length}</span>
    </div>
  ),
}));

import AppPage from "./AppPage";

describe("AppPage in a production build (FE026)", () => {
  it("defaults to live data, not the mock demo, and falls back to mock only on a failed live fetch", async () => {
    const originalFetch = global.fetch;
    // Live mode calls fetch on mount - make it fail fast so this test
    // doesn't depend on a real backend (same pattern as the non-production
    // "switching source" test in AppPage.test.jsx).
    global.fetch = () => Promise.reject(new Error("no backend in this test"));

    render(<AppPage />);

    // Defaulting to "live" (not "mock") means the API-unreachable error
    // banner appears on mount, without the user ever clicking a toggle -
    // there is no toggle to click in production (see TopBar.production.test.jsx).
    await waitFor(() => {
      expect(screen.getByText(/không nối được api thật/i)).toBeInTheDocument();
    });

    // useGraphData's existing graceful fallback still applies: even though
    // the default is "live", a failed fetch falls back to showing the mock
    // dataset rather than an empty/broken canvas.
    await waitFor(() => {
      expect(screen.getByTestId("node-count")).toHaveTextContent(String(mockNodes.length));
    });

    expect(screen.queryByRole("button", { name: "Mock" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "API thật" })).not.toBeInTheDocument();

    global.fetch = originalFetch;
  });
});
