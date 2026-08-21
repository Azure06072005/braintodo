import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
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
});