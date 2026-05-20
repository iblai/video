"use client"

import type React from "react"

import { usePathname } from "next/navigation"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { AppHeader } from "@/components/app-header"
import { Footer } from "@/components/footer"
import { IblaiProviders } from "@/providers/iblai-providers"
import { UpdateSubscriptionModal } from "@/components/iblai/update-subscription-modal"

interface ConditionalLayoutProps {
  children: React.ReactNode
}

/**
 * The previous `AdminGuard` ("Admin access required" 403) and
 * `HeygenGuard` ("HeyGen integration required" 424) page swaps are
 * gone. Every signed-in user reaches every route, the community feed
 * is unrestricted, and the upgrade-subscription modal is the only
 * gate: it self-opens on any non-community route when the user lacks
 * platform-admin rights or a HeyGen credential on the tenant.
 */
export function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname()

  // Auth pages and SSO callback don't get providers or sidebar
  const isAuthPage = pathname === "/login" || pathname === "/"
  const isSsoCallback = pathname?.startsWith("/sso-login")

  if (isAuthPage || isSsoCallback) {
    return <div className="min-h-screen">{children}</div>
  }

  const isCommunityPage =
    pathname === "/community" || pathname?.startsWith("/community/")

  const shell = (
    <>
      <AppSidebar />
      <div className="flex h-screen w-full">
        <div className="flex flex-1 flex-col overflow-hidden">
          <AppHeader />
          <div className="flex flex-1 flex-col overflow-hidden">
            <main className="flex-1 overflow-auto bg-white">{children}</main>
            <Footer />
          </div>
        </div>
      </div>
    </>
  )

  return (
    <IblaiProviders>
      <SidebarProvider defaultOpen={true}>
        {shell}
        {/* Non-community routes need admin + HeyGen. Modal self-gates
            (no-op for users who already have both). Keyed by pathname so
            it re-opens on every route entry. Community = unrestricted,
            no modal. */}
        {!isCommunityPage && <UpdateSubscriptionModal key={pathname} />}
      </SidebarProvider>
    </IblaiProviders>
  )
}
