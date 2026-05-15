"use client";

/**
 * ibl.ai Credit Balance widget.
 *
 * Renders the SDK `<CreditBalance>` in the navbar's right-side cluster,
 * before the notification bell. Gated to admins on a paywall-enabled
 * tenant — see `/iblai-credit` skill.
 */

import * as React from "react";
import { CreditBalance } from "@iblai/iblai-js/web-containers";

import config from "@/lib/iblai/config";
import { resolveAppTenant } from "@/lib/iblai/tenant";
import { useIsAdmin } from "@/hooks/use-is-admin";

interface TenantEntry {
  key: string;
  show_paywall?: boolean;
}

function useTenantShowsPaywall(tenantKey: string): boolean {
  const [show, setShow] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined" || !tenantKey) return;
    const compute = () => {
      try {
        const raw = localStorage.getItem("tenants");
        if (!raw) return setShow(false);
        const parsed = JSON.parse(raw) as TenantEntry[] | TenantEntry;
        const list = Array.isArray(parsed) ? parsed : [parsed];
        setShow(Boolean(list.find((t) => t?.key === tenantKey)?.show_paywall));
      } catch {
        setShow(false);
      }
    };
    compute();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "tenants" || e.key === "tenant") compute();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [tenantKey]);
  return show;
}

function useUserIdentity(): { username: string; email: string } {
  const [identity, setIdentity] = React.useState({ username: "", email: "" });
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("userData");
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, string | undefined>;
      setIdentity({
        username: parsed.user_nicename ?? parsed.username ?? "",
        email: parsed.user_email ?? parsed.email ?? "",
      });
    } catch {
      // fall through with empty defaults
    }
  }, []);
  return identity;
}

export function IblaiCreditBalance() {
  const tenantKey = React.useMemo(() => resolveAppTenant(), []);
  const isAdmin = useIsAdmin();
  const showPaywall = useTenantShowsPaywall(tenantKey);
  const { username, email } = useUserIdentity();

  if (!tenantKey || !showPaywall || !isAdmin || !username || !email) {
    return null;
  }

  return (
    <CreditBalance
      tenant={tenantKey}
      enabled={true}
      redirectUrl={window.location.origin}
      mainPlatformKey={config.mainTenantKey()}
      currentUserEmail={email}
      username={username}
    />
  );
}
