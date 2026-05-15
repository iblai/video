"use client"

import { ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSidebar } from "@/components/ui/sidebar"
import { ProfileDropdown } from "@/components/iblai/profile-dropdown"
import { IblaiNotificationBell } from "@/components/iblai/notification-bell"
import { IblaiCreditBalance } from "@/components/iblai/credit-balance"
import { useRouter } from "next/navigation"

export function AppHeader() {
  const { toggleSidebar, isMobile } = useSidebar()
  const router = useRouter()

  const handleToggleClick = () => {
    toggleSidebar()
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-videoai-stroke bg-white px-6">
      {isMobile && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleToggleClick}
          className="h-8 w-8 bg-white border border-gray-200 rounded-md hover:bg-gray-50 focus:ring-0 focus:ring-offset-0 transition-colors"
        >
          <ChevronRight className="h-4 w-4 text-gray-600" />
        </Button>
      )}

      <div className="flex-1" />

      <div className="flex items-center gap-4">
        <IblaiCreditBalance />
        <IblaiNotificationBell
          onViewAll={() => router.push("/notifications")}
        />
        <ProfileDropdown />
      </div>
    </header>
  )
}
