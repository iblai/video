"use client";

/**
 * ibl.ai Profile Dropdown
 *
 * A fully self-contained user avatar + dropdown menu with profile editing,
 * tenant switching, and logout. Uses the SDK's UserProfileDropdown component.
 *
 * Usage:
 *   import { ProfileDropdown } from "@/components/iblai/profile-dropdown";
 *   <ProfileDropdown />
 *
 * Prerequisites:
 *   - <IblaiProviders> must wrap this component's ancestor tree
 *   - @iblai/iblai-js/web-containers/styles must be imported in globals.css
 */

import { useMemo } from "react";
import { UserProfileDropdown } from "@iblai/iblai-js/web-containers/next";
import config from "@/lib/iblai/config";
import { resolveAppTenant } from "@/lib/iblai/tenant";
import { handleLogout, handleTenantSwitch } from "@/lib/iblai/auth-utils";

interface ProfileDropdownProps {
  /** Additional CSS class for the dropdown trigger. */
  className?: string;
}

export function ProfileDropdown({ className }: ProfileDropdownProps) {
  const { username, email } = useMemo(() => {
    if (typeof window === "undefined") return { username: "", email: "" };
    try {
      const raw = localStorage.getItem("userData");
      if (!raw) return { username: "", email: "" };
      const parsed = JSON.parse(raw);
      return {
        username: parsed.user_nicename ?? parsed.username ?? "",
        email: parsed.user_email ?? parsed.email ?? "",
      };
    } catch {
      return { username: "", email: "" };
    }
  }, []);

  const tenantKey = useMemo(() => resolveAppTenant(), []);

  const userTenants = useMemo(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem("tenants");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }, []);

  const currentTenant = useMemo(() => {
    if (!tenantKey || userTenants.length === 0) return undefined;
    return userTenants.find((t: any) => t.key === tenantKey);
  }, [tenantKey, userTenants]);

  const isAdmin = !!currentTenant?.is_admin;

  return (
    <UserProfileDropdown
      username={username}
      email={email}
      tenantKey={tenantKey}
      mainPlatformKey={config.mainTenantKey()}
      userIsAdmin={isAdmin}
      userTenants={userTenants}
      currentTenant={currentTenant}
      showProfileTab
      showAccountTab
      showTenantSwitcher
      showHelpLink={false}
      showLogoutButton
      authURL={config.authUrl()}
      onLogout={handleLogout}
      onTenantChange={handleTenantSwitch}
      onTenantUpdate={(tenant: any) => {
        if (!tenant?.key) return;
        localStorage.setItem("tenant", tenant.key);
        localStorage.setItem("current_tenant", JSON.stringify(tenant));
        try {
          const raw = localStorage.getItem("tenants");
          const list = raw ? JSON.parse(raw) : [];
          const updated = list.map((t: any) =>
            t.key === tenant.key ? tenant : t,
          );
          localStorage.setItem("tenants", JSON.stringify(updated));
        } catch {
          /* ignore */
        }
      }}
      className={className}
    />
  );
}
