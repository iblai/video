"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { hasNonExpiredAuthToken, redirectToAuthSpa } from "@/lib/iblai/auth-utils"
import { useIsAdmin } from "@/hooks/use-is-admin"
import { useHasHeygenCredential } from "@/hooks/use-has-heygen-credential"

export default function HomePage() {
  const router = useRouter()
  const isAdmin = useIsAdmin()
  const heygen = useHasHeygenCredential()
  const [resolved, setResolved] = useState(false)

  // useIsAdmin is effect-driven (false on first paint, settles a tick
  // later). Wait one tick before routing so an admin isn't misrouted to
  // /community on the initial false.
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
    // Wait for the heygen credential probe to settle before routing an
    // admin -- otherwise admins with a valid key flash through
    // /community before landing on /ai-avatar/generate.
    if (isAdmin && heygen === "checking") return
    // Only admins WITH a HeyGen key land on the avatar generate page.
    // Everyone else (students in any tenant, admins without a HeyGen
    // key) lands on the public community feed -- the one surface that
    // doesn't need admin + HeyGen.
    const target =
      isAdmin && heygen === "ok" ? "/ai-avatar/generate" : "/community"
    router.replace(target)
  }, [router, resolved, isAdmin, heygen])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  )
}
