
/**
 * ibl.ai auth helper utilities.
 *
 * These are thin wrappers used by IblaiProviders. You can customise the
 * redirect behaviour here without touching the provider component.
 */

import config from "./config";
import { resolveAppTenant } from "./tenant";

/**
 * Navigate to a URL.
 *
 * On Tauri mobile, `window.location.href` is blocked by the Android
 * WebView for external URLs. This helper calls the `navigate_to` Tauri
 * command which uses `Webview::navigate()` (maps to `WebView.loadUrl()`),
 * bypassing the system filter.
 */
function navigateTo(url: string) {
  window.location.href = url;
}

/** Redirect the browser to the ibl.ai Auth SPA for login. */
export function redirectToAuthSpa(
  redirectTo?: string,
  platformKey?: string,
  logout?: boolean,
  saveRedirect?: boolean,
) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const path = redirectTo ?? (typeof window !== "undefined" ? window.location.pathname : "/");

  if (saveRedirect) {
    localStorage.setItem("redirect-to", path);
  }

  const params = new URLSearchParams({
    "redirect-to": origin,
    app: "custom",
  });
  if (platformKey) params.set("tenant", platformKey);
  if (logout) params.set("logout", "1");

  navigateTo(`${config.authUrl()}/login?${params.toString()}`);
}

/** Check whether a non-expired auth token exists in localStorage. */
export function hasNonExpiredAuthToken(): boolean {
  if (typeof window === "undefined") return false;
  const token = localStorage.getItem("axd_token");
  if (!token) return false;
  const expiry = localStorage.getItem("axd_token_expires");
  if (!expiry) return false;
  return new Date(expiry) > new Date();
}

/** Handle logout: clear state and redirect to the Auth SPA logout page. */
export function handleLogout() {
  const tenant = resolveAppTenant();
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  localStorage.clear();
  navigateTo(`${config.authUrl()}/logout?redirect-to=${origin}&tenant=${tenant}`);
}

/**
 * Switch to a different tenant.
 *
 * Mirrors mentorai's pattern: preserves the JWT, clears localStorage, and
 * redirects to the Auth SPA's /login/complete endpoint so the new session
 * is established for the target tenant without a full re-login.
 */
export async function handleTenantSwitch(tenant: string) {
  if (typeof window === "undefined") return;
  if (!tenant || tenant === localStorage.getItem("tenant")) return;

  const jwtToken = localStorage.getItem("edx_jwt_token");
  const origin = window.location.origin;

  localStorage.clear();
  localStorage.setItem("tenant", tenant);

  const params = new URLSearchParams({
    tenant,
    "redirect-to": origin,
  });
  if (jwtToken) params.set("token", jwtToken);

  navigateTo(`${config.authUrl()}/login/complete?${params.toString()}`);
}
