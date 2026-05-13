import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { resolveAppTenant } from "@/lib/iblai/tenant";

describe("resolveAppTenant", () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    localStorage.clear();
  });

  it("returns the tenant from localStorage", () => {
    localStorage.setItem("tenant", "acme");
    expect(resolveAppTenant()).toBe("acme");
  });

  it("returns empty string when no tenant is set", () => {
    expect(resolveAppTenant()).toBe("");
  });
});
