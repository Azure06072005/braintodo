import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PersonalizationPanel from "./PersonalizationPanel";
import { PersonalizationProvider } from "../personalization/PersonalizationContext";

function renderPanel() {
  return render(
    <PersonalizationProvider>
      <PersonalizationPanel />
    </PersonalizationProvider>
  );
}

describe("PersonalizationPanel", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders all setting controls: palette presets, star density select, glow slider, and comet trail checkbox", () => {
    renderPanel();

    expect(screen.getByText("Bảng màu")).toBeInTheDocument();
    expect(screen.getByText("Tinh vân")).toBeInTheDocument();
    expect(screen.getByText("Cực quang")).toBeInTheDocument();
    expect(screen.getByText("Mặt trời")).toBeInTheDocument();

    expect(screen.getByText("Mật độ sao")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();

    expect(screen.getByText(/độ sáng viền node/i)).toBeInTheDocument();
    expect(screen.getByRole("slider")).toBeInTheDocument();

    expect(screen.getByRole("checkbox")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Khôi phục mặc định" })).toBeInTheDocument();
  });

  it("clicking a palette button changes active palette selection", () => {
    renderPanel();

    const auroraBtn = screen.getByText("Cực quang").closest("button");
    expect(auroraBtn).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(auroraBtn);
    expect(auroraBtn).toHaveAttribute("aria-pressed", "true");
  });

  it("changing star density select updates selection", () => {
    renderPanel();

    const select = screen.getByRole("combobox");
    expect(select).toHaveValue("medium");

    fireEvent.change(select, { target: { value: "high" } });
    expect(select).toHaveValue("high");
  });

  it("toggling comet trail checkbox changes its checked state", () => {
    renderPanel();

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeChecked();

    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it("clicking reset button restores default values", () => {
    renderPanel();

    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();

    fireEvent.click(screen.getByRole("button", { name: "Khôi phục mặc định" }));
    expect(checkbox).toBeChecked();
  });
});
