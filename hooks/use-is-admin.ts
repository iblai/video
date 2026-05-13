"use client";

import * as React from "react";

import { resolveAppTenant } from "@/lib/iblai/tenant";

interface TenantEntry {
  key: string;
  is_admin?: boolean;
  is_staff?: boolean;
}

/**
 * Returns whether the active user is an admin of the current tenant.
 * Reads `localStorage.tenants` (set by the SDK's `<TenantProvider>`)
 * and matches the entry whose `key` equals `resolveAppTenant()`. Returns
 * `false` until the tenant is resolved or if no matching entry exists.
 *
 * Mirrors `hq/hooks/use-is-admin.ts` — the only difference is that we
 * source the tenant from `resolveAppTenant()` (env → SDK tenant) instead
 * of `useUrlContext()` since videoAI's routes are not tenant-scoped.
 */
export function useIsAdmin(): boolean {
  const [isAdmin, setIsAdmin] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const compute = () => {
      try {
        const tenant = resolveAppTenant();
        if (!tenant) {
          setIsAdmin(false);
          return;
        }
        const raw = localStorage.getItem("tenants");
        if (!raw) {
          setIsAdmin(false);
          return;
        }
        const parsed = JSON.parse(raw) as TenantEntry[] | TenantEntry;
        const list = Array.isArray(parsed) ? parsed : [parsed];
        const match = list.find((t) => t?.key === tenant);
        setIsAdmin(Boolean(match?.is_admin));
      } catch {
        setIsAdmin(false);
      }
    };
    compute();
    // Re-evaluate when the SDK or auth flow updates the tenants blob.
    const onStorage = (e: StorageEvent) => {
      if (e.key === "tenants" || e.key === "tenant") {
        compute();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return isAdmin;
}
