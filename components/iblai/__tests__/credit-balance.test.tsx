import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

let mockedTenant = "acme";

vi.mock("@/lib/iblai/tenant", () => ({
  resolveAppTenant: () => mockedTenant,
}));
vi.mock("@/lib/iblai/config", () => ({
  default: {
    authUrl: () => "https://auth.test",
    mainTenantKey: () => "main",
  },
}));
vi.mock("@iblai/iblai-js/web-containers", () => ({
  CreditBalance: (props: Record<string, unknown>) => (
    <div data-testid="credit-balance" data-props={JSON.stringify(props)} />
  ),
}));

import { IblaiCreditBalance } from "@/components/iblai/credit-balance";

describe("IblaiCreditBalance", () => {
  beforeEach(() => {
    localStorage.clear();
    mockedTenant = "acme";
  });
  afterEach(() => {
    localStorage.clear();
  });

  function seed({
    isAdmin = true,
    showPaywall = true,
    username = "alice",
    email = "alice@example.com",
  }: {
    isAdmin?: boolean;
    showPaywall?: boolean;
    username?: string;
    email?: string;
  } = {}) {
    localStorage.setItem(
      "tenants",
      JSON.stringify([{ key: "acme", is_admin: isAdmin, show_paywall: showPaywall }]),
    );
    localStorage.setItem(
      "userData",
      JSON.stringify({ user_nicename: username, user_email: email }),
    );
  }

  it("renders the SDK widget with the resolved tenant + identity when all gates pass", async () => {
    seed();
    render(<IblaiCreditBalance />);
    await waitFor(() => {
      const node = screen.getByTestId("credit-balance");
      const props = JSON.parse(node.getAttribute("data-props") ?? "{}");
      expect(props.tenant).toBe("acme");
      expect(props.username).toBe("alice");
      expect(props.currentUserEmail).toBe("alice@example.com");
      expect(props.mainPlatformKey).toBe("main");
      expect(props.enabled).toBe(true);
      expect(typeof props.redirectUrl).toBe("string");
    });
  });

  it("returns null when the tenant is empty", () => {
    mockedTenant = "";
    seed();
    const { container } = render(<IblaiCreditBalance />);
    expect(container).toBeEmptyDOMElement();
  });

  it("returns null when the tenant has show_paywall=false", async () => {
    seed({ showPaywall: false });
    const { container } = render(<IblaiCreditBalance />);
    // Wait briefly for the hook to read localStorage, then assert empty.
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it("returns null for non-admins", async () => {
    seed({ isAdmin: false });
    const { container } = render(<IblaiCreditBalance />);
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it("returns null when userData is missing email", async () => {
    seed({ email: "" });
    const { container } = render(<IblaiCreditBalance />);
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it("returns null when userData is missing the nicename/username", async () => {
    seed({ username: "" });
    const { container } = render(<IblaiCreditBalance />);
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it("falls back to username/email aliases on userData", async () => {
    localStorage.setItem(
      "tenants",
      JSON.stringify([{ key: "acme", is_admin: true, show_paywall: true }]),
    );
    localStorage.setItem(
      "userData",
      JSON.stringify({ username: "bob", email: "bob@example.com" }),
    );
    render(<IblaiCreditBalance />);
    await waitFor(() => {
      const props = JSON.parse(
        screen.getByTestId("credit-balance").getAttribute("data-props") ?? "{}",
      );
      expect(props.username).toBe("bob");
      expect(props.currentUserEmail).toBe("bob@example.com");
    });
  });
});
