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
vi.mock("@/components/iblai/update-subscription-modal", () => ({
  UpdateSubscriptionModal: () => (
    <div data-testid="upgrade-modal" />
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

  it("wraps authed non-community routes in providers + chrome + upgrade modal (no admin/heygen gate pages)", () => {
    mockedPathname = "/ai-avatar/generate";
    render(
      <ConditionalLayout>
        <span>child</span>
      </ConditionalLayout>,
    );
    expect(screen.getByTestId("iblai-providers")).toBeInTheDocument();
    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("header")).toBeInTheDocument();
    expect(screen.getByTestId("footer")).toBeInTheDocument();
    // Modal mounts on non-community routes (self-gates internally).
    expect(screen.getByTestId("upgrade-modal")).toBeInTheDocument();
    // Removed gate pages must not render.
    expect(screen.queryByTestId("admin-guard")).not.toBeInTheDocument();
    expect(screen.queryByTestId("heygen-guard")).not.toBeInTheDocument();
  });

  it("does not mount the upgrade modal on the community route", () => {
    mockedPathname = "/community";
    render(
      <ConditionalLayout>
        <span>child</span>
      </ConditionalLayout>,
    );
    expect(screen.getByTestId("iblai-providers")).toBeInTheDocument();
    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
    expect(screen.queryByTestId("upgrade-modal")).not.toBeInTheDocument();
  });
});
