import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

let mockedPathname = "/";

vi.mock("next/navigation", () => ({
  usePathname: () => mockedPathname,
}));
vi.mock("@/providers/iblai-providers", () => ({
  IblaiProviders: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="iblai-providers">{children}</div>
  ),
}));
vi.mock("@/components/admin-guard", () => ({
  AdminGuard: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="admin-guard">{children}</div>
  ),
}));
vi.mock("@/components/heygen-guard", () => ({
  HeygenGuard: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="heygen-guard">{children}</div>
  ),
}));
vi.mock("@/components/app-sidebar", () => ({
  AppSidebar: () => <div data-testid="sidebar" />,
}));
vi.mock("@/components/app-header", () => ({
  AppHeader: () => <div data-testid="header" />,
}));
vi.mock("@/components/footer", () => ({
  Footer: () => <div data-testid="footer" />,
}));
vi.mock("@/components/ui/sidebar", () => ({
  SidebarProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sidebar-provider">{children}</div>
  ),
}));

import { ConditionalLayout } from "@/components/conditional-layout";

describe("ConditionalLayout", () => {
  it("renders just the children for the home auth route", () => {
    mockedPathname = "/";
    render(
      <ConditionalLayout>
        <span>child</span>
      </ConditionalLayout>,
    );
    expect(screen.getByText("child")).toBeInTheDocument();
    expect(screen.queryByTestId("iblai-providers")).not.toBeInTheDocument();
  });

  it("renders just the children for /login", () => {
    mockedPathname = "/login";
    render(
      <ConditionalLayout>
        <span>child</span>
      </ConditionalLayout>,
    );
    expect(screen.queryByTestId("iblai-providers")).not.toBeInTheDocument();
  });

  it("renders just the children for /sso-login routes", () => {
    mockedPathname = "/sso-login-complete";
    render(
      <ConditionalLayout>
        <span>child</span>
      </ConditionalLayout>,
    );
    expect(screen.queryByTestId("iblai-providers")).not.toBeInTheDocument();
  });

  it("wraps authed routes in providers + admin guard + heygen guard + chrome", () => {
    mockedPathname = "/ai-avatar/generate";
    render(
      <ConditionalLayout>
        <span>child</span>
      </ConditionalLayout>,
    );
    expect(screen.getByTestId("iblai-providers")).toBeInTheDocument();
    expect(screen.getByTestId("admin-guard")).toBeInTheDocument();
    expect(screen.getByTestId("heygen-guard")).toBeInTheDocument();
    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("header")).toBeInTheDocument();
    expect(screen.getByTestId("footer")).toBeInTheDocument();
  });
});
