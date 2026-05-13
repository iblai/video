
/**
 * Tenant resolution for ibl.ai apps.
 *
 * Reads the current tenant key from the `tenant` localStorage entry,
 * which is set by the SDK's TenantProvider after login.
 */

/** Resolve the current tenant key from localStorage. */
export function resolveAppTenant(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("tenant") ?? "";
}
