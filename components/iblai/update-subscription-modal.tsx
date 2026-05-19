"use client"

import { useEffect, useState } from "react"
import { UpgradePackageModal } from "@iblai/iblai-js/web-containers"

import { useIsAdmin } from "@/hooks/use-is-admin"
import { resolveAppTenant } from "@/lib/iblai/tenant"
import { PUBLIC_VIDEO_TENANT } from "@/lib/iblai/catalog"

/**
 * Resolve the signed-in user's email from the SDK's `userData` blob in
 * localStorage (same source `lib/iblai/catalog` reads the username from).
 */
function currentUserEmail(): string {
  if (typeof window === "undefined") return ""
  try {
    const parsed = JSON.parse(localStorage.getItem("userData") || "{}")
    return parsed.user_email ?? parsed.email ?? ""
  } catch {
    return ""
  }
}

/**
 * Mentorai-style "update subscription" prompt, backed by the SDK
 * `UpgradePackageModal` (no Redux / 402 / flow machinery).
 *
 * Shown only to students (non platform-admin users) on the main tenant.
 * Platform admins and non-main tenants always render nothing.
 *
 * Two modes:
 *  - **Controlled**: pass `open` + `onClose` (the sidebar opens it when a
 *    student clicks a gated tab; navigation is cancelled, page unchanged).
 *  - **Uncontrolled**: omit props — it self-opens once on mount (fallback
 *    for a direct hit / refresh on a non-community route).
 *
 * Renders nothing until admin/tenant state resolves (mirrors
 * `AdminGuard`'s effect-tick pattern so it doesn't flash for admins
 * before `useIsAdmin` settles).
 */
interface UpdateSubscriptionModalProps {
  open?: boolean
  onClose?: () => void
}

export function UpdateSubscriptionModal({
  open: openProp,
  onClose,
}: UpdateSubscriptionModalProps = {}) {
  const isAdmin = useIsAdmin()
  const [resolved, setResolved] = useState(false)
  const [openState, setOpenState] = useState(true)

  useEffect(() => {
    const id = window.setTimeout(() => setResolved(true), 0)
    return () => window.clearTimeout(id)
  }, [])

  if (!resolved) return null

  // "in main" = the literal "main" tenant (PUBLIC_VIDEO_TENANT).
  const tenant = resolveAppTenant()
  const email = currentUserEmail()

  if (isAdmin || tenant !== PUBLIC_VIDEO_TENANT || !email) return null

  const controlled = openProp !== undefined
  const open = controlled ? openProp : openState
  const handleClose = () => {
    if (controlled) onClose?.()
    else setOpenState(false)
  }

  return (
    <UpgradePackageModal
      open={open}
      onClose={handleClose}
      redirectUrl={
        typeof window !== "undefined" ? window.location.origin : ""
      }
      mainPlatformKey={PUBLIC_VIDEO_TENANT}
      sourcePlatformKey={tenant}
      currentUserEmail={email}
    />
  )
}
