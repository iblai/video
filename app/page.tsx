"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { hasNonExpiredAuthToken, redirectToAuthSpa } from "@/lib/iblai/auth-utils"

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    if (!hasNonExpiredAuthToken()) {
      redirectToAuthSpa()
      return
    }
    router.replace("/ai-avatar/generate")
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  )
}
