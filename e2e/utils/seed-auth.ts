import type { Page } from "@playwright/test";

export interface SeedAuthOptions {
  tenantKey?: string;
  username?: string;
  /** ISO string, future-dated so token-validity checks pass. */
  expiresAt?: string;
}

/**
 * Stub the localStorage shape that the ibl.ai SDK + `resolveAppTenant`
 * expect. ONLY suitable for tests that don't trigger the SDK's
 * <AuthProvider> — i.e. truly public routes that bypass auth. Any
 * journey that hits an RTK Query hook needs the real SSO setup
 * (`e2e/auth.setup.ts`) instead, since the SDK will reject our stub
 * tokens and redirect to the login SPA.
 */
export async function seedAuth(page: Page, opts: SeedAuthOptions = {}) {
  const tenantKey = opts.tenantKey ?? "main";
  const username = opts.username ?? "tester";
  const expiresAt = opts.expiresAt ?? "2099-01-01T00:00:00.000Z";

  await page.addInitScript(
    ({ tenantKey, username, expiresAt }) => {
      const tenant = {
        user_id: 1,
        username,
        email: `${username}@example.com`,
        user_active: true,
        key: tenantKey,
        org: tenantKey,
        platform_name: "Test",
        is_admin: true,
        is_staff: true,
        active: true,
      };
      localStorage.setItem("tenant", tenantKey);
      localStorage.setItem("app_tenant", tenantKey);
      localStorage.setItem("current_tenant", JSON.stringify(tenant));
      localStorage.setItem("tenants", JSON.stringify([tenant]));
      localStorage.setItem(
        "userData",
        JSON.stringify({
          user_id: 1,
          user_nicename: username,
          username,
          email: `${username}@example.com`,
        }),
      );
      localStorage.setItem("axd_token", "stub-axd-token");
      localStorage.setItem("axd_token_expires", expiresAt);
      localStorage.setItem("dm_token", "stub-dm-token");
      localStorage.setItem("dm_token_expires", expiresAt);
    },
    { tenantKey, username, expiresAt },
  );
}
