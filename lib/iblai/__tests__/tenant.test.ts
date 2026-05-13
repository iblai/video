import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock config so we can control which env value `mainTenantKey()` returns.
vi.mock("@/lib/iblai/config", () => {
  const state = { mainTenantKey: "" };
  return {
    __setMainTenantKey: (v: string) => {
      state.mainTenantKey = v;
    },
    default: {
      mainTenantKey: () => state.mainTenantKey,
    },
  };
});

import * as configModule from "@/lib/iblai/config";
import { resolveAppTenant } from "@/lib/iblai/tenant";

const setMainTenantKey = (
  configModule as unknown as { __setMainTenantKey: (v: string) => void }
).__setMainTenantKey;

describe("resolveAppTenant", () => {
  beforeEach(() => {
    setMainTenantKey("");
    localStorage.clear();
  });
  afterEach(() => {
    localStorage.clear();
  });

  it("returns the env tenant when non-placeholder", () => {
    setMainTenantKey("acme");
    expect(resolveAppTenant()).toBe("acme");
    expect(localStorage.getItem("app_tenant")).toBe("acme");
  });

  it("skips placeholder env values and falls back to app_tenant", () => {
    setMainTenantKey("main");
    localStorage.setItem("app_tenant", "previously-cached");
    expect(resolveAppTenant()).toBe("previously-cached");
  });

  it("falls back to SDK tenant key when nothing else is set", () => {
    localStorage.setItem("tenant", "sdk-tenant");
    expect(resolveAppTenant()).toBe("sdk-tenant");
    // promotes SDK value to app_tenant cache
    expect(localStorage.getItem("app_tenant")).toBe("sdk-tenant");
  });

  it("returns empty string when no source resolves", () => {
    expect(resolveAppTenant()).toBe("");
  });
});
