import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/iblai/config", () => ({
  default: { authUrl: () => "https://auth.test" },
}));
vi.mock("@/lib/iblai/tenant", () => ({
  resolveAppTenant: () => mockedTenant,
}));

let mockedTenant = "acme";

import {
  handleLogout,
  handleTenantSwitch,
  hasNonExpiredAuthToken,
  redirectToAuthSpa,
} from "@/lib/iblai/auth-utils";

interface MutableLocation {
  href: string;
  origin: string;
  pathname: string;
}

const originalLocation = window.location;
let location: MutableLocation;

function setLocation(href: string) {
  const url = new URL(href);
  location = { href, origin: url.origin, pathname: url.pathname };
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: location,
  });
}

describe("auth-utils", () => {
  beforeEach(() => {
    localStorage.clear();
    mockedTenant = "acme";
    setLocation("https://app.test/current");
  });
  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: originalLocation,
    });
    localStorage.clear();
  });

  describe("redirectToAuthSpa", () => {
    it("navigates to /login with app=custom and origin in redirect-to", () => {
      redirectToAuthSpa();
      const url = new URL(location.href);
      expect(url.origin + url.pathname).toBe("https://auth.test/login");
      expect(url.searchParams.get("redirect-to")).toBe("https://app.test");
      expect(url.searchParams.get("app")).toBe("custom");
      expect(url.searchParams.get("tenant")).toBeNull();
      expect(url.searchParams.get("logout")).toBeNull();
    });

    it("includes tenant and logout flags when provided", () => {
      redirectToAuthSpa(undefined, "acme", true, false);
      const url = new URL(location.href);
      expect(url.searchParams.get("tenant")).toBe("acme");
      expect(url.searchParams.get("logout")).toBe("1");
    });

    it("saves the current path to localStorage when saveRedirect=true", () => {
      redirectToAuthSpa(undefined, undefined, false, true);
      expect(localStorage.getItem("redirect-to")).toBe("/current");
    });

    it("uses an explicit redirectTo value when saving", () => {
      redirectToAuthSpa("/elsewhere", undefined, false, true);
      expect(localStorage.getItem("redirect-to")).toBe("/elsewhere");
    });
  });

  describe("hasNonExpiredAuthToken", () => {
    it("returns false when token is missing", () => {
      expect(hasNonExpiredAuthToken()).toBe(false);
    });

    it("returns false when expiry is missing", () => {
      localStorage.setItem("axd_token", "t");
      expect(hasNonExpiredAuthToken()).toBe(false);
    });

    it("returns false when expiry is in the past", () => {
      localStorage.setItem("axd_token", "t");
      localStorage.setItem("axd_token_expires", "2000-01-01T00:00:00.000Z");
      expect(hasNonExpiredAuthToken()).toBe(false);
    });

    it("returns true when expiry is in the future", () => {
      localStorage.setItem("axd_token", "t");
      localStorage.setItem("axd_token_expires", "2999-01-01T00:00:00.000Z");
      expect(hasNonExpiredAuthToken()).toBe(true);
    });
  });

  describe("handleLogout", () => {
    it("clears localStorage and navigates to the auth logout endpoint with origin + tenant", () => {
      localStorage.setItem("axd_token", "t");
      handleLogout();
      expect(localStorage.length).toBe(0);
      const url = new URL(location.href);
      expect(url.origin + url.pathname).toBe("https://auth.test/logout");
      expect(url.searchParams.get("redirect-to")).toBe("https://app.test");
      expect(url.searchParams.get("tenant")).toBe("acme");
    });
  });

  describe("handleTenantSwitch", () => {
    it("no-ops when tenant is empty", async () => {
      const before = location.href;
      await handleTenantSwitch("");
      expect(location.href).toBe(before);
    });

    it("no-ops when tenant is the same as the current one", async () => {
      localStorage.setItem("tenant", "acme");
      const before = location.href;
      await handleTenantSwitch("acme");
      expect(location.href).toBe(before);
    });

    it("clears storage, sets the new tenant, and redirects to /login/complete", async () => {
      localStorage.setItem("tenant", "old");
      localStorage.setItem("edx_jwt_token", "jwt-value");
      await handleTenantSwitch("new-tenant");

      expect(localStorage.getItem("tenant")).toBe("new-tenant");
      expect(localStorage.getItem("edx_jwt_token")).toBeNull();
      const url = new URL(location.href);
      expect(url.origin + url.pathname).toBe("https://auth.test/login/complete");
      expect(url.searchParams.get("tenant")).toBe("new-tenant");
      expect(url.searchParams.get("redirect-to")).toBe("https://app.test");
      expect(url.searchParams.get("token")).toBe("jwt-value");
    });

    it("omits the token query param when no jwt exists", async () => {
      localStorage.setItem("tenant", "old");
      await handleTenantSwitch("new-tenant");
      const url = new URL(location.href);
      expect(url.searchParams.get("token")).toBeNull();
    });
  });
});
