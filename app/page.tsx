"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { hasNonExpiredAuthToken, redirectToAuthSpa } from "@/lib/iblai/auth-utils"
import { useIsAdmin } from "@/hooks/use-is-admin"
import { resolveAppTenant } from "@/lib/iblai/tenant"
import { PUBLIC_VIDEO_TENANT } from "@/lib/iblai/catalog"

export default function HomePage() {
  const router = useRouter()
  const isAdmin = useIsAdmin()
  const [resolved, setResolved] = useState(false)

  // useIsAdmin is effect-driven (false on first paint, settles a tick
  // later). Wait one tick before routing so an admin isn't misrouted to
  // /community on the initial false. Mirrors AdminGuard's pattern.
  useEffect(() => {
    const id = window.setTimeout(() => setResolved(true), 0)
    return () => window.clearTimeout(id)
  }, [])

  useEffect(() => {
    if (!hasNonExpiredAuthToken()) {
      redirectToAuthSpa()
      return
    }
    if (!resolved) return
    // Students (non platform-admin users) on the "main" tenant land on
    // the public community feed; admins (and any non-main tenant) go to
    // the avatar generate page. "main" = the literal main tenant.
    const inMain = resolveAppTenant() === PUBLIC_VIDEO_TENANT
    router.replace(inMain && !isAdmin ? "/community" : "/ai-avatar/generate")
  }, [router, resolved, isAdmin])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  )
}
