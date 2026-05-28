"use client";

/**
 * ibl.ai Provider wrapper.
 *
 * Wrap your root layout children with <IblaiProviders> to get:
 *  - Redux store (RTK Query for IBL APIs)
 *  - AuthProvider  (SSO redirect, JWT validation, cross-SPA sync)
 *  - TenantProvider (multi-tenant routing)
 *
 * Usage in app/layout.tsx:
 *
 *   import { IblaiProviders } from "@/providers/iblai-providers";
 *   export default function RootLayout({ children }) {
 *     return <html><body><IblaiProviders>{children}</IblaiProviders></body></html>;
 *   }
 */

import { Suspense, useMemo, useState, type ReactNode } from "react";
import { Provider as ReduxProvider } from "react-redux";
import { usePathname } from "next/navigation";
import { initializeDataLayer } from "@iblai/iblai-js/data-layer";
import {
  AuthProvider,
  TenantProvider,
  redirectToAuthSpa,
} from "@iblai/iblai-js/web-utils";

import { iblaiStore } from "@/store/iblai-store";
import { LocalStorageService } from "@/lib/iblai/storage-service";
import config from "@/lib/iblai/config";
import { resolveAppTenant } from "@/lib/iblai/tenant";
import {
  authSpaOptions,
  hasNonExpiredAuthToken,
  handleLogout,
} from "@/lib/iblai/auth-utils";
import { StripeCallbackHandler } from "@/components/iblai/stripe-callback-handler";

const storageService = LocalStorageService.getInstance();

/** Routes that do NOT require authentication. */
const PUBLIC_ROUTES = new Map<RegExp, () => Promise<boolean>>([
  [new RegExp("^/sso-login"), async () => false],
]);

export function IblaiProviders({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // initializeDataLayer MUST be called synchronously before any children
  // render so that Config.lmsUrl / Config.dmUrl are set before RTK Query
  // hooks (e.g. inside the Profile component) fire their first queries.
  // useState initializer runs during the render cycle, not after it.
  const [isInitialized] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      // data-layer v1.2+ signature:
      // (dmUrl, lmsUrl, legacyLmsUrl, storageService, httpErrorHandler)
      initializeDataLayer(
        config.dmUrl(),
        config.lmsUrl(),
        config.lmsUrl(),  // legacyLmsUrl (same as lmsUrl for consolidated API)
        storageService,
        {
          401: () => redirectToAuthSpa({ ...authSpaOptions(), logout: true }),
        },
      );
    } catch (e) {
      console.error("[ibl.ai] initializeDataLayer failed:", e);
    }
    return true;
  });

  const username = useMemo(() => {
    if (typeof window === "undefined") return "";
    try {
      const raw = localStorage.getItem("userData");
      if (raw) return JSON.parse(raw).user_nicename ?? "";
    } catch { /* ignore */ }
    return "";
  }, [isInitialized]);

  // Tenant resolution: localStorage tenant
  const tenantKey = useMemo(() => resolveAppTenant(), [isInitialized]);

  const isSsoRoute = pathname?.startsWith("/sso-login") ?? false;

  const LOADING = (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-gray-400">Loading...</p>
    </div>
  );

  if (!isInitialized) return LOADING;

  // Storage sync watches localStorage across tabs and refreshes the page
  // when the SSO SPA writes new tokens. It races slow e2e assertions, so
  // the test env can disable it two ways:
  //   1. NEXT_PUBLIC_DISABLE_STORAGE_SYNC=1   (build-time, dev server env)
  //   2. localStorage.__disable_storage_sync === "1"  (runtime, set
  //      per-page by Playwright via addInitScript — works against any
  //      already-running dev server without restart)
  const envDisabled =
    process.env.NEXT_PUBLIC_DISABLE_STORAGE_SYNC === "1" ||
    process.env.NEXT_PUBLIC_DISABLE_STORAGE_SYNC === "true";
  const lsDisabled =
    typeof window !== "undefined" &&
    localStorage.getItem("__disable_storage_sync") === "1";
  const storageSyncEnabled = !envDisabled && !lsDisabled;

  return (
    <ReduxProvider store={iblaiStore}>
      {/* `useSearchParams` opts the subtree out of static prerendering;
          wrap in Suspense so the rest of the layout can still be SSG'd. */}
      <Suspense fallback={null}>
        <StripeCallbackHandler />
      </Suspense>
      <AuthProvider
        skip={isSsoRoute}
        redirectToAuthSpa={(redirectTo, platformKey, logout, saveRedirect) =>
          redirectToAuthSpa({
            ...authSpaOptions(),
            redirectTo,
            platformKey,
            logout,
            saveRedirect,
          })
        }
        hasNonExpiredAuthToken={hasNonExpiredAuthToken}
        username={username}
        pathname={pathname ?? "/"}
        storageService={storageService}
        middleware={PUBLIC_ROUTES}
        enableStorageSync={storageSyncEnabled}
        fallback={LOADING}
      >
        <TenantProvider
          skip={isSsoRoute}
          currentTenant={tenantKey}
          requestedTenant={tenantKey}
          saveCurrentTenant={(t: any) => {
            const key = typeof t === "string" ? t : t?.key ?? String(t);
            localStorage.setItem("current_tenant", key);
            localStorage.setItem("tenant", key);
          }}
          saveUserTenants={(t: unknown) =>
            localStorage.setItem("tenants", JSON.stringify(t))
          }
          handleTenantSwitch={async () => {
            const tenant = resolveAppTenant();
            redirectToAuthSpa({
              ...authSpaOptions(),
              platformKey: tenant,
              saveRedirect: true,
            });
          }}
          redirectToAuthSpa={(redirectTo, platformKey, logout, saveRedirect) =>
            redirectToAuthSpa({
              ...authSpaOptions(),
              redirectTo,
              platformKey,
              logout,
              saveRedirect,
            })
          }
          username={username}
          fallback={LOADING}
        >
          {children}
        </TenantProvider>
      </AuthProvider>
    </ReduxProvider>
  );
}
