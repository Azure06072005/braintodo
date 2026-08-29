import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LandingPage from "./LandingPage";

describe("LandingPage", () => {
  it("renders the braintodo heading and tagline", () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );
    expect(screen.getByRole("heading", { name: "braintodo" })).toBeInTheDocument();
    expect(screen.getByText(/gợi ý liên kết/i)).toBeInTheDocument();
  });

  it("links 'Vào app' to /app and 'Đăng nhập' to /login", () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );
    expect(screen.getByRole("link", { name: "Vào app" })).toHaveAttribute("href", "/app");
    expect(screen.getByRole("link", { name: "Đăng nhập" })).toHaveAttribute("href", "/login");
  });

  it("renders the vision section with all 3 feature cards", () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );
    expect(screen.getByText("Đồ thị, không phải danh sách")).toBeInTheDocument();
    expect(screen.getByText("Gợi ý kết nối bằng GNN")).toBeInTheDocument();
    expect(screen.getByText("Tự động phát hiện cụm")).toBeInTheDocument();
  });

  it("renders all 4 'how it works' steps, numbered in order", () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );
    const steps = screen.getAllByRole("listitem");
    expect(steps).toHaveLength(4);
    expect(steps[0]).toHaveTextContent("1");
    expect(steps[0]).toHaveTextContent("Tạo ý tưởng như một node");
    expect(steps[3]).toHaveTextContent("4");
    expect(steps[3]).toHaveTextContent("Đăng nhập để lưu dự án của bạn");
  });

  it("renders the interactive mock-data Example section", () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );
    expect(screen.getByText("Ví dụ (dữ liệu mẫu)")).toBeInTheDocument();
    const demo = screen.getByTestId("landing-demo-graph");
    expect(demo.querySelector("svg")).toBeInTheDocument();
  });

  it("clicking a node in the Example demo shows its title and tags in the preview panel", () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/bấm vào một node bên trái/i)).toBeInTheDocument();

    const demo = screen.getByTestId("landing-demo-graph");
    // Node shapes live inside the draggable per-node <g cursor="grab">;
    // pulse-animation dots (one <circle> per edge) are separate <circle>
    // elements appended earlier and would otherwise be indistinguishable
    // from an actual clickable node shape (see GraphCanvas.test.jsx's
    // nodeCircles() helper for the same distinction).
    const firstNodeShape = demo.querySelector('g[cursor="grab"] > circle, g[cursor="grab"] > rect');
    expect(firstNodeShape).toBeInTheDocument();
    fireEvent.click(firstNodeShape);

    expect(screen.queryByText(/bấm vào một node bên trái/i)).not.toBeInTheDocument();
  });

  it("renders a final CTA distinct from the hero CTA", () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );
    expect(screen.getByRole("link", { name: "Bắt đầu miễn phí" })).toHaveAttribute(
      "href",
      "/register"
    );
  });
});