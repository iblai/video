
/**
 * ibl.ai auth helper utilities.
 *
 * These are thin wrappers used by IblaiProviders. You can customise the
 * redirect behaviour here without touching the provider component.
 */

import config from "./config";
import { resolveAppTenant } from "./tenant";
import { getBasePath } from "./base-path";

/**
 * `window.location.origin` + the configured sub-path prefix. The Auth
 * SPA's `redirect-to` callback must point at the app's actual mount
 * point -- with sub-path deployment that is `<origin><basePath>`, not
 * the bare origin (otherwise post-login lands at the wrong path and
 * 404s when the host has no root app).
 */
function originWithBasePath(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}${getBasePath()}`;
}

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
  const origin = originWithBasePath();
  // `window.location.pathname` already includes the basePath when the
  // app is mounted under one -- keep it intact so the saved
  // redirect-to round-trips back to the same page after login.
  const path = redirectTo ?? (typeof window !== "undefined" ? window.location.pathname : "/");

  if (saveRedirect) {
    // localStorage uses camelCase to match the SDK's `SsoLogin`
    // `redirectPathKey="redirectTo"`. URL query stays kebab-case.
    localStorage.setItem("redirectTo", path);
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
  const origin = originWithBasePath();
  localStorage.clear();
  navigateTo(`${config.authUrl()}/logout?redirect-to=${origin}&tenant=${tenant}`);
}

export interface TenantSwitchOptions {
  /**
   * Override the post-switch landing URL. Defaults to
   * `${origin}${basePath}`. Pass the current page (minus any
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

  // Re-entrancy guard: another tab / a previous mount may have already
  // kicked off a tenant switch. Bailing prevents the cross-SPA cookie
  // from being clobbered mid-round-trip.
  if (
    typeof document !== "undefined" &&
    document.cookie.includes("ibl_tenant_switching")
  ) {
    return;
  }

  if (!tenant || tenant === localStorage.getItem("tenant")) return;

  // Mark the switch in progress BEFORE any other writes so concurrent
  // mounts see the guard.
  setCrossSpaCookie("ibl_tenant_switching", "true");

  // Clear the SDK's cross-SPA `current_tenant` cookie. If we leave it
  // set, the auth SPA reads the stale OLD tenant on the round trip,
  // refuses to issue tokens for the new tenant, and the user lands
  // logged out. This must happen BEFORE the localStorage clear and
  // the navigation away.
  try {
    const { clearCurrentTenantCookie } = await import(
      "@iblai/iblai-js/web-utils"
    );
    clearCurrentTenantCookie();
  } catch {
    /* SDK may not export it on older versions — fall through */
  }

  const jwtToken = localStorage.getItem("edx_jwt_token");
  const origin = originWithBasePath();

  // The auth-SPA round trip lands on /sso-login-complete, where the
  // SDK's `SsoLogin` component does
  // `window.location.href = ${window.location.origin}${redirectPath}`.
  // That breaks when `redirectPath` is a full URL (two origins get
  // concatenated). Always send `${origin}` as the `redirect-to` URL
  // query and save just the path+search to `localStorage.redirectTo`
  // so SsoLogin reads it back cleanly.
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
  // localStorage uses `redirectTo` (camelCase) — matches
  // `redirectPathKey="redirectTo"` on app/sso-login-complete/page.tsx
  // and the key the SDK's `SsoLogin` component reads on the way back.
  // The URL query param to the auth SPA stays kebab-case (`redirect-to`).
  if (redirectPath) localStorage.setItem("redirectTo", redirectPath);

  const params = new URLSearchParams({
    tenant,
    "redirect-to": origin,
  });
  if (jwtToken) params.set("token", jwtToken);

  // Tiny delay lets the cookie writes flush before navigation —
  // without it the auth SPA can read stale cookies set on this tick
  // and refuse to issue tokens.
  await new Promise((resolve) => setTimeout(resolve, 100));

  navigateTo(`${config.authUrl()}/login/complete?${params.toString()}`);
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
