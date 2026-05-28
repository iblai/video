import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/iblai/config", () => ({
  default: { authUrl: () => "https://auth.test" },
}));
vi.mock("@/lib/iblai/tenant", () => ({
  resolveAppTenant: () => mockedTenant,
}));

// The helper dynamic-imports `@iblai/iblai-js/web-utils` for
// `clearCurrentTenantCookie`. Stub it so the test doesn't pull the
// real SDK module graph in and we can assert the call site.
const clearCurrentTenantCookie = vi.fn();
vi.mock("@iblai/iblai-js/web-utils", () => ({
  clearCurrentTenantCookie,
}));

let mockedTenant = "acme";

import {
  authSpaOptions,
  handleLogout,
  handleTenantSwitch,
  hasNonExpiredAuthToken,
} from "@/lib/iblai/auth-utils";

interface MutableLocation {
  href: string;
  origin: string;
  pathname: string;
  hostname: string;
}

const originalLocation = window.location;
let location: MutableLocation;

function setLocation(href: string) {
  const url = new URL(href);
  location = {
    href,
    origin: url.origin,
    pathname: url.pathname,
    hostname: url.hostname,
  };
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: location,
  });
}

function clearCookies() {
  if (typeof document === "undefined") return;
  for (const c of document.cookie.split(";")) {
    const eq = c.indexOf("=");
    const name = (eq > -1 ? c.slice(0, eq) : c).trim();
    if (!name) continue;
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
  }
}

describe("auth-utils", () => {
  let cookieWrites: string[];
  const originalCookieDescriptor = Object.getOwnPropertyDescriptor(
    Document.prototype,
    "cookie",
  );

  beforeEach(() => {
    localStorage.clear();
    clearCookies();
    clearCurrentTenantCookie.mockClear();
    // JSDOM rejects `Secure` cookies on its non-HTTPS default URL, so
    // capture writes ourselves to assert what the helper attempted.
    cookieWrites = [];
    Object.defineProperty(document, "cookie", {
      configurable: true,
      get: () => cookieWrites.join("; "),
      set: (val: string) => {
        cookieWrites.push(val);
      },
    });
    mockedTenant = "acme";
    setLocation("https://app.test/current");
  });
  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: originalLocation,
    });
    if (originalCookieDescriptor) {
      Object.defineProperty(Document.prototype, "cookie", originalCookieDescriptor);
    }
    localStorage.clear();
  });

  describe("authSpaOptions", () => {
    it("returns the per-app defaults to spread into SDK redirectToAuthSpa calls", () => {
      const opts = authSpaOptions();
      expect(opts.authUrl).toBe("https://auth.test");
      expect(opts.appName).toBe("custom");
      expect(opts.platformKey).toBe("acme");
      // SsoLogin reads this key on the way back; SDK default is
      // `redirect_to` which would drop the saved redirect path.
      expect(opts.redirectPathStorageKey).toBe("redirectTo");
      // SDK's cross-SPA login/logout-timestamp guard depends on this.
      expect(typeof opts.hasNonExpiredAuthToken).toBe("function");
    });

    it("re-reads the active tenant on each call (no stale closure)", () => {
      mockedTenant = "first";
      expect(authSpaOptions().platformKey).toBe("first");
      mockedTenant = "second";
      expect(authSpaOptions().platformKey).toBe("second");
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

    it("parses epoch-milliseconds expiry", () => {
      localStorage.setItem("axd_token", "t");
      localStorage.setItem(
        "axd_token_expires",
        String(Date.now() + 60_000),
      );
      expect(hasNonExpiredAuthToken()).toBe(true);
    });

    it("parses epoch-seconds expiry", () => {
      localStorage.setItem("axd_token", "t");
      localStorage.setItem(
        "axd_token_expires",
        String(Math.floor(Date.now() / 1000) + 60),
      );
      expect(hasNonExpiredAuthToken()).toBe(true);
    });

    it("returns false when expiry is unparseable", () => {
      localStorage.setItem("axd_token", "t");
      localStorage.setItem("axd_token_expires", "not-a-date");
      expect(hasNonExpiredAuthToken()).toBe(false);
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

    it("always sends `${origin}` as the auth-SPA redirect-to (never a full URL)", async () => {
      localStorage.setItem("tenant", "old");
      await handleTenantSwitch("new-tenant", {
        redirectUrl: "https://app.test/specific-page?foo=bar",
      });
      const url = new URL(location.href);
      // SsoLogin does `${window.location.origin}${redirectPath}` on the
      // way back; sending a full URL would concatenate two origins and
      // log the user out of videoai post-Stripe.
      expect(url.searchParams.get("redirect-to")).toBe("https://app.test");
    });

    it("saves the redirectUrl's path+search to localStorage.redirectTo for SsoLogin to read", async () => {
      localStorage.setItem("tenant", "old");
      await handleTenantSwitch("new-tenant", {
        redirectUrl: "https://app.test/specific-page?foo=bar",
      });
      expect(localStorage.getItem("redirectTo")).toBe("/specific-page?foo=bar");
    });

    it("does not touch `redirectTo` localStorage when no redirectUrl is provided", async () => {
      localStorage.setItem("tenant", "old");
      await handleTenantSwitch("new-tenant");
      expect(localStorage.getItem("redirectTo")).toBeNull();
    });

    it("defaults redirect-to to the origin when no redirectUrl is provided", async () => {
      localStorage.setItem("tenant", "old");
      await handleTenantSwitch("new-tenant");
      const url = new URL(location.href);
      expect(url.searchParams.get("redirect-to")).toBe("https://app.test");
    });

    it("accepts a path-only redirectUrl and saves it as-is", async () => {
      localStorage.setItem("tenant", "old");
      await handleTenantSwitch("new-tenant", {
        redirectUrl: "/relative-page?x=1",
      });
      expect(localStorage.getItem("redirectTo")).toBe("/relative-page?x=1");
    });

    it("sets the cross-SPA `ibl_tenant_switching` cookie before redirecting", async () => {
      localStorage.setItem("tenant", "old");
      await handleTenantSwitch("new-tenant");
      const wrote = cookieWrites.find((c) =>
        c.startsWith("ibl_tenant_switching="),
      );
      expect(wrote).toBeDefined();
      expect(wrote).toContain("ibl_tenant_switching=true");
      expect(wrote).toContain("path=/");
    });

    it("does not set the cookie when the call is a no-op (same tenant)", async () => {
      localStorage.setItem("tenant", "acme");
      await handleTenantSwitch("acme");
      expect(
        cookieWrites.some((c) => c.startsWith("ibl_tenant_switching=")),
      ).toBe(false);
    });

    it("clears the SDK's `current_tenant` cookie before redirecting", async () => {
      localStorage.setItem("tenant", "old");
      await handleTenantSwitch("new-tenant");
      expect(clearCurrentTenantCookie).toHaveBeenCalledTimes(1);
    });

    it("bails (no redirect, no cookie) when ibl_tenant_switching is already set", async () => {
      cookieWrites.push("ibl_tenant_switching=true;path=/");
      localStorage.setItem("tenant", "old");
      const before = location.href;
      await handleTenantSwitch("new-tenant");
      expect(location.href).toBe(before);
      // No NEW switching cookie was written on top of the existing one.
      const writes = cookieWrites.filter((c) =>
        c.startsWith("ibl_tenant_switching="),
      );
      expect(writes).toHaveLength(1);
      expect(clearCurrentTenantCookie).not.toHaveBeenCalled();
    });
  });
});
