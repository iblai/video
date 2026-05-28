
/**
 * ibl.ai auth helper utilities.
 *
 * Redirects to the Auth SPA go through `redirectToAuthSpa(options)` from
 * `@iblai/iblai-js/web-utils` at every call site. This module only
 * exports the static, app-specific options (`authSpaOptions`) plus the
 * token-expiry check the SDK depends on, the logout helper, and the
 * tenant-switch flow.
 *
 * NOTE: the SDK hardcodes the `redirect-to` query param to
 * `window.location.origin`. The previous `originWithBasePath()` (which
 * appended `NEXT_PUBLIC_BASE_PATH`) is dropped, so sub-path deployments
 * will land at the bare origin after login. Re-introduce via an SDK PR
 * exposing a `redirectToUrl` option.
 */

import type { RedirectToAuthSpaOptions } from "@iblai/iblai-js/web-utils";

import config from "./config";
import { resolveAppTenant } from "./tenant";

/**
 * Parse an `axd_token_expires` value written by the Auth SPA into a
 * millisecond timestamp. The SPA can send any of:
 *   - ISO string ("2099-01-01T00:00:00Z")
 *   - epoch in milliseconds ("1735689600000")
 *   - epoch in seconds  ("1735689600")
 *
 * Epoch strings fed straight to `new Date(...)` return `Invalid Date`,
 * so without this every post-login check reported the token as expired
 * and the SDK looped back to the Auth SPA.
 */
function parseExpiryMs(raw: string): number {
  const trimmed = raw.trim();
  if (/^-?\d+$/.test(trimmed)) {
    const n = Number(trimmed);
    return n < 1e12 ? n * 1000 : n;
  }
  const parsed = Date.parse(trimmed);
  return Number.isNaN(parsed) ? NaN : parsed;
}

/** Check whether a non-expired auth token exists in localStorage. */
export function hasNonExpiredAuthToken(): boolean {
  if (typeof window === "undefined") return false;
  const token = localStorage.getItem("axd_token");
  if (!token) return false;
  const expiry = localStorage.getItem("axd_token_expires");
  if (!expiry) return false;
  const expiryMs = parseExpiryMs(expiry);
  if (!Number.isFinite(expiryMs)) return false;
  return expiryMs > Date.now();
}

/**
 * Per-app defaults to spread into every SDK `redirectToAuthSpa` call.
 *
 *   import { redirectToAuthSpa } from "@iblai/iblai-js/web-utils";
 *   import { authSpaOptions } from "@/lib/iblai/auth-utils";
 *   redirectToAuthSpa({ ...authSpaOptions(), logout: true });
 */
export function authSpaOptions(): RedirectToAuthSpaOptions {
  return {
    authUrl: config.authUrl(),
    appName: "custom",
    platformKey: resolveAppTenant(),
    redirectPathStorageKey: "redirectTo",
    hasNonExpiredAuthToken,
  };
}

/** Handle logout: clear state and redirect to the Auth SPA logout page. */
export function handleLogout() {
  const tenant = resolveAppTenant();
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  localStorage.clear();
  window.location.href = `${config.authUrl()}/logout?redirect-to=${origin}&tenant=${tenant}`;
}

export interface TenantSwitchOptions {
  /**
   * Override the post-switch landing URL. Defaults to
   * `window.location.origin`. Pass the current page (minus any
   * transient query params) to return the user to the same view.
   */
  redirectUrl?: string;
}

/**
 * Switch to a different tenant.
 *
 * Mirrors mentorai's pattern: preserves the JWT, clears localStorage, and
 * redirects to the Auth SPA's /login/complete endpoint so the new session
 * is established for the target tenant without a full re-login. Sets the
 * cross-SPA `ibl_tenant_switching` cookie so components (e.g. the upgrade
 * modal) can suppress UI while the round-trip is in flight.
 */
export async function handleTenantSwitch(
  tenant: string,
  options: TenantSwitchOptions = {},
) {
  if (typeof window === "undefined") return;

  if (
    typeof document !== "undefined" &&
    document.cookie.includes("ibl_tenant_switching")
  ) {
    return;
  }

  if (!tenant || tenant === localStorage.getItem("tenant")) return;

  setCrossSpaCookie("ibl_tenant_switching", "true");

  try {
    const { clearCurrentTenantCookie } = await import(
      "@iblai/iblai-js/web-utils"
    );
    clearCurrentTenantCookie();
  } catch {
    /* SDK may not export it on older versions — fall through */
  }

  const jwtToken = localStorage.getItem("edx_jwt_token");
  const origin = window.location.origin;

  let redirectPath: string | null = null;
  if (options.redirectUrl) {
    try {
      const url = new URL(options.redirectUrl, window.location.origin);
      redirectPath = `${url.pathname}${url.search}`;
    } catch {
      redirectPath = options.redirectUrl;
    }
  }

  localStorage.clear();
  localStorage.setItem("tenant", tenant);
  if (redirectPath) localStorage.setItem("redirectTo", redirectPath);

  const params = new URLSearchParams({
    tenant,
    "redirect-to": origin,
  });
  if (jwtToken) params.set("token", jwtToken);

  await new Promise((resolve) => setTimeout(resolve, 100));

  window.location.href = `${config.authUrl()}/login/complete?${params.toString()}`;
}

function setCrossSpaCookie(name: string, value: string, days = 365) {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const hostname = window.location.hostname;
  let baseDomain = hostname;
  if (hostname !== "localhost" && !/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    const parts = hostname.split(".");
    if (parts.length > 2) baseDomain = `.${parts.slice(-2).join(".")}`;
  }
  const domainAttr = baseDomain ? `;domain=${baseDomain}` : "";
  document.cookie =
    `${name}=${encodeURIComponent(value)};` +
    `expires=${expires.toUTCString()};path=/;SameSite=None;Secure` +
    domainAttr;
}
