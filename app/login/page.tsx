"use client"

import { useEffect } from "react"
import { redirectToAuthSpa } from "@iblai/iblai-js/web-utils"
import { authSpaOptions } from "@/lib/iblai/auth-utils"

export default function LoginPage() {
  useEffect(() => {
    void redirectToAuthSpa(authSpaOptions())
  }, [])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to login...</p>
      </div>
    </div>
  )
}
