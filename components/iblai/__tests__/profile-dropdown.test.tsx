import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

let mockedTenant = "acme";

vi.mock("@/lib/iblai/config", () => ({
  default: {
    authUrl: () => "https://auth.test",
    mainTenantKey: () => "main",
  },
}));
vi.mock("@/lib/iblai/tenant", () => ({
  resolveAppTenant: () => mockedTenant,
}));
vi.mock("@/lib/iblai/auth-utils", () => ({
  handleLogout: vi.fn(),
  handleTenantSwitch: vi.fn(),
}));
vi.mock("@iblai/iblai-js/web-containers/next", () => ({
  UserProfileDropdown: (props: Record<string, unknown>) => (
    <div data-testid="dropdown" data-props={JSON.stringify(props)} />
  ),
}));

import { ProfileDropdown } from "@/components/iblai/profile-dropdown";

describe("ProfileDropdown", () => {
  beforeEach(() => {
    localStorage.clear();
    mockedTenant = "acme";
  });
  afterEach(() => {
    localStorage.clear();
  });

  it("passes the resolved tenant + admin flag derived from tenants[]", () => {
    localStorage.setItem(
      "userData",
      JSON.stringify({ user_nicename: "alice" }),
    );
    localStorage.setItem(
      "tenants",
      JSON.stringify([
        { key: "acme", is_admin: true, name: "Acme" },
        { key: "other", is_admin: false },
      ]),
    );
    render(<ProfileDropdown />);
    const props = JSON.parse(
      screen.getByTestId("dropdown").getAttribute("data-props") ?? "{}",
    );
    expect(props.username).toBe("alice");
    expect(props.tenantKey).toBe("acme");
    expect(props.userIsAdmin).toBe(true);
    expect(props.showTenantSwitcher).toBe(true);
    expect(props.currentTenant.key).toBe("acme");
    expect(props.userTenants).toHaveLength(2);
  });

  it("falls back to false admin when no tenants entry matches", () => {
    localStorage.setItem("tenants", JSON.stringify([{ key: "other", is_admin: true }]));
    render(<ProfileDropdown />);
    const props = JSON.parse(
      screen.getByTestId("dropdown").getAttribute("data-props") ?? "{}",
    );
    expect(props.userIsAdmin).toBe(false);
    expect(props.currentTenant).toBeUndefined();
  });

  it("tolerates malformed userData/tenants JSON", () => {
    localStorage.setItem("userData", "{not-json");
    localStorage.setItem("tenants", "{not-json");
    render(<ProfileDropdown />);
    const props = JSON.parse(
      screen.getByTestId("dropdown").getAttribute("data-props") ?? "{}",
    );
    expect(props.username).toBe("");
    expect(props.userTenants).toEqual([]);
  });
});
