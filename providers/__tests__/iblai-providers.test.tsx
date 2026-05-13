import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const initializeDataLayerMock = vi.fn();
let mockedTenant = "acme";
let mockedPathname = "/dashboard";
const tenantProviderProps: { current: Record<string, unknown> } = { current: {} };

vi.mock("@iblai/iblai-js/data-layer", () => ({
  initializeDataLayer: (...a: unknown[]) => initializeDataLayerMock(...a),
}));
vi.mock("@iblai/iblai-js/web-utils", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="auth-provider">{children}</div>
  ),
  TenantProvider: (props: Record<string, unknown> & { children: React.ReactNode }) => {
    tenantProviderProps.current = props;
    return <div data-testid="tenant-provider">{props.children as React.ReactNode}</div>;
  },
}));
vi.mock("react-redux", () => ({
  Provider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="redux-provider">{children}</div>
  ),
}));
vi.mock("@/store/iblai-store", () => ({ iblaiStore: {} }));
vi.mock("@/lib/iblai/storage-service", () => ({
  LocalStorageService: {
    getInstance: () => ({
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    }),
  },
}));
vi.mock("@/lib/iblai/config", () => ({
  default: {
    dmUrl: () => "https://dm.test",
    lmsUrl: () => "https://lms.test",
  },
}));
vi.mock("@/lib/iblai/tenant", () => ({
  resolveAppTenant: () => mockedTenant,
}));
vi.mock("@/lib/iblai/auth-utils", () => ({
  redirectToAuthSpa: vi.fn(),
  hasNonExpiredAuthToken: () => true,
  handleLogout: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => mockedPathname,
}));

import { IblaiProviders } from "@/providers/iblai-providers";

describe("IblaiProviders", () => {
  beforeEach(() => {
    initializeDataLayerMock.mockReset();
    localStorage.clear();
    mockedTenant = "acme";
    mockedPathname = "/dashboard";
    tenantProviderProps.current = {};
  });
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("initializes the data layer with config URLs", () => {
    render(
      <IblaiProviders>
        <span>child</span>
      </IblaiProviders>,
    );
    expect(initializeDataLayerMock).toHaveBeenCalled();
    const args = initializeDataLayerMock.mock.calls[0];
    expect(args[0]).toBe("https://dm.test");
    expect(args[1]).toBe("https://lms.test");
  });

  it("renders the full provider tree with children", () => {
    render(
      <IblaiProviders>
        <span>child</span>
      </IblaiProviders>,
    );
    expect(screen.getByTestId("redux-provider")).toBeInTheDocument();
    expect(screen.getByTestId("auth-provider")).toBeInTheDocument();
    expect(screen.getByTestId("tenant-provider")).toBeInTheDocument();
    expect(screen.getByText("child")).toBeInTheDocument();
  });

  it("passes the resolved tenant as currentTenant + requestedTenant", () => {
    render(
      <IblaiProviders>
        <span>child</span>
      </IblaiProviders>,
    );
    expect(tenantProviderProps.current.currentTenant).toBe("acme");
    expect(tenantProviderProps.current.requestedTenant).toBe("acme");
  });

  it("forwards the username from localStorage", () => {
    localStorage.setItem(
      "userData",
      JSON.stringify({ user_nicename: "alice" }),
    );
    render(
      <IblaiProviders>
        <span>child</span>
      </IblaiProviders>,
    );
    expect(tenantProviderProps.current.username).toBe("alice");
  });

  it("saveCurrentTenant accepts both string and object payloads", () => {
    render(
      <IblaiProviders>
        <span>child</span>
      </IblaiProviders>,
    );
    const save = tenantProviderProps.current.saveCurrentTenant as (
      t: unknown,
    ) => void;
    save("acme-2");
    expect(localStorage.getItem("tenant")).toBe("acme-2");
    expect(localStorage.getItem("current_tenant")).toBe("acme-2");

    save({ key: "acme-3" });
    expect(localStorage.getItem("tenant")).toBe("acme-3");
  });

  it("saveUserTenants persists the JSON-encoded list", () => {
    render(
      <IblaiProviders>
        <span>child</span>
      </IblaiProviders>,
    );
    const save = tenantProviderProps.current.saveUserTenants as (
      t: unknown,
    ) => void;
    save([{ key: "acme" }]);
    expect(localStorage.getItem("tenants")).toBe(
      JSON.stringify([{ key: "acme" }]),
    );
  });

  it("sets skip=true when the path is an SSO callback", () => {
    mockedPathname = "/sso-login-complete";
    render(
      <IblaiProviders>
        <span>child</span>
      </IblaiProviders>,
    );
    expect(tenantProviderProps.current.skip).toBe(true);
  });

  it("falls back gracefully when initializeDataLayer throws", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    initializeDataLayerMock.mockImplementationOnce(() => {
      throw new Error("boom");
    });
    render(
      <IblaiProviders>
        <span>child</span>
      </IblaiProviders>,
    );
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
