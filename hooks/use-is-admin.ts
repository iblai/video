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

    let cancelled = false;
    let pollId: number | null = null;

    // Returns true when `tenants` localStorage is populated (the SDK has
    // hydrated the list); the admin flag is committed to state inside.
    const compute = (): boolean => {
      try {
        const tenant = resolveAppTenant();
        if (!tenant) {
          if (!cancelled) setIsAdmin(false);
          return false;
        }
        const raw = localStorage.getItem("tenants");
        if (!raw) {
          if (!cancelled) setIsAdmin(false);
          return false;
        }
        const parsed = JSON.parse(raw) as TenantEntry[] | TenantEntry;
        const list = Array.isArray(parsed) ? parsed : [parsed];
        if (list.length === 0) {
          if (!cancelled) setIsAdmin(false);
          return false;
        }
        const match = list.find((t) => t?.key === tenant);
        if (!cancelled) setIsAdmin(Boolean(match?.is_admin));
        return true;
      } catch {
        if (!cancelled) setIsAdmin(false);
        return false;
      }
    };

    const startPolling = () => {
      if (pollId !== null) return;
      let attempts = 0;
      pollId = window.setInterval(() => {
        attempts += 1;
        if (cancelled || compute() || attempts >= 40) {
          if (pollId !== null) {
            window.clearInterval(pollId);
            pollId = null;
          }
        }
      }, 50);
    };

    // First read attempt. If `tenants` isn't populated yet (typical
    // post-mount and post-tenant-switch), poll until it lands. Same-tab
    // writes don't fire `storage` events, so the listener below only
    // covers cross-tab updates.
    if (!compute()) startPolling();

    const onStorage = (e: StorageEvent) => {
      if (e.key === "tenants" || e.key === "tenant") compute();
    };
    window.addEventListener("storage", onStorage);

    return () => {
      cancelled = true;
      window.removeEventListener("storage", onStorage);
      if (pollId !== null) window.clearInterval(pollId);
    };
  }, []);

  return isAdmin;
}
