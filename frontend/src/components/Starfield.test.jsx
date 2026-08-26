import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import Starfield from "./Starfield";

/**
 * jsdom's real HTMLCanvasElement.getContext('2d') returns null (no native
 * `canvas` package installed) - Starfield handles that gracefully by
 * rendering nothing, which is what most tests below exercise. The two
 * tests that need to verify the *drawing* code path (reduced-motion
 * behavior, cleanup) need a minimal fake 2D context so that code path
 * actually runs instead of bailing out on the null check.
 */
function mockCanvasContext() {
  const ctx = {
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    fillStyle: null,
    globalAlpha: 1,
  };
  return vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(ctx);
}

describe("Starfield", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders without crashing and is hidden from assistive tech", () => {
    render(<Starfield />);
    const el = screen.getByTestId("starfield");
    expect(el).toBeInTheDocument();
    expect(el).toHaveAttribute("aria-hidden", "true");
  });

  it("renders a canvas element for the twinkling stars", () => {
    const { container } = render(<Starfield />);
    expect(container.querySelector("canvas")).toBeInTheDocument();
  });

  it("renders orbit ring SVG ellipses", () => {
    const { container } = render(<Starfield />);
    const ellipses = container.querySelectorAll("svg ellipse");
    expect(ellipses.length).toBeGreaterThan(0);
  });

  it("mounts and unmounts cleanly without throwing (even without a real canvas 2D context)", () => {
    const getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockReturnValue(null);

    const { unmount } = render(<Starfield />);
    expect(() => unmount()).not.toThrow();
    getContextSpy.mockRestore();
  });

  it("respects prefers-reduced-motion by not scheduling further animation frames", () => {
    mockCanvasContext();
    const rafSpy = vi.spyOn(globalThis, "requestAnimationFrame");
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });

    render(<Starfield />);

    // Reduced motion draws exactly one frame and does not re-schedule.
    expect(rafSpy).toHaveBeenCalledTimes(1);
  });

  it("cleans up its resize listener and animation frame on unmount", () => {
    mockCanvasContext();
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<Starfield />);
    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith("resize", expect.any(Function));
  });
});