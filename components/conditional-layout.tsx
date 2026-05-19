"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { AppHeader } from "@/components/app-header"
import { Footer } from "@/components/footer"
import { IblaiProviders } from "@/providers/iblai-providers"
import { AdminGuard } from "@/components/admin-guard"
import { HeygenGuard } from "@/components/heygen-guard"
import { UpdateSubscriptionModal } from "@/components/iblai/update-subscription-modal"
import { useIsAdmin } from "@/hooks/use-is-admin"
import { resolveAppTenant } from "@/lib/iblai/tenant"
import { PUBLIC_VIDEO_TENANT } from "@/lib/iblai/catalog"

interface ConditionalLayoutProps {
  children: React.ReactNode
}

export function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname()
  const isAdmin = useIsAdmin()
  const [resolved, setResolved] = useState(false)

  // useIsAdmin is effect-driven (false on first paint). Wait one tick so
  // we never flash the 403 page to a student-in-main before their
  // non-admin status settles. Mirrors AdminGuard.
  useEffect(() => {
    const id = window.setTimeout(() => setResolved(true), 0)
    return () => window.clearTimeout(id)
  }, [])

  // Auth pages and SSO callback don't get providers or sidebar
  const isAuthPage = pathname === "/login" || pathname === "/"
  const isSsoCallback = pathname?.startsWith("/sso-login")

  if (isAuthPage || isSsoCallback) {
    return <div className="min-h-screen">{children}</div>
  }

  // Community is the public, "shared with the community" video feed. It
  // reads tenant-wide catalog resources filtered to visibility === "public"
  // and needs neither platform-admin rights nor a HeyGen credential, so
  // students (non platform-admin users) reach it without the admin/HeyGen
  // gates. Every other route stays admin- and HeyGen-gated.
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

  // Student (non platform-admin user) on the literal "main" tenant.
  const isStudentInMain =
    resolved && !isAdmin && resolveAppTenant() === PUBLIC_VIDEO_TENANT

  let body: React.ReactNode
  if (isCommunityPage) {
    // Unrestricted, no modal.
    body = shell
  } else if (!resolved) {
    // Hold render until admin/tenant state settles so no 403 flashes.
    body = null
  } else if (isStudentInMain) {
    // Other tabs: do NOT swap to the "Admin access required" (or HeyGen)
    // page and do NOT navigate. Keep the page as-is and just show the
    // upgrade modal on top. Keyed by pathname so it re-opens each time
    // the student clicks a different tab.
    body = (
      <>
        {shell}
        <UpdateSubscriptionModal key={pathname} />
      </>
    )
  } else {
    // Admins (and non-admins outside the main tenant) keep the gates.
    body = (
      <AdminGuard>
        <HeygenGuard>{shell}</HeygenGuard>
      </AdminGuard>
    )
  }

  return (
    <IblaiProviders>
      <SidebarProvider defaultOpen={true}>{body}</SidebarProvider>
    </IblaiProviders>
  )
}
