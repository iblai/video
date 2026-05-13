"use client"

import type React from "react"

import { usePathname } from "next/navigation"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { AppHeader } from "@/components/app-header"
import { Footer } from "@/components/footer"
import { IblaiProviders } from "@/providers/iblai-providers"
import { AdminGuard } from "@/components/admin-guard"
import { HeygenGuard } from "@/components/heygen-guard"

interface ConditionalLayoutProps {
  children: React.ReactNode
}

export function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname()

  // Auth pages and SSO callback don't get providers or sidebar
  const isAuthPage = pathname === "/login" || pathname === "/"
  const isSsoCallback = pathname?.startsWith("/sso-login")

  if (isAuthPage || isSsoCallback) {
    return <div className="min-h-screen">{children}</div>
  }

  return (
    <IblaiProviders>
      <SidebarProvider defaultOpen={true}>
        <AdminGuard>
          <HeygenGuard>
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
          </HeygenGuard>
        </AdminGuard>
      </SidebarProvider>
    </IblaiProviders>
  )
}
