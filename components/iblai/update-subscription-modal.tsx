"use client"

import { useEffect, useState } from "react"
import { UpgradePackageModal } from "@iblai/iblai-js/web-containers"

import { useIsAdmin } from "@/hooks/use-is-admin"
import { useHasHeygenCredential } from "@/hooks/use-has-heygen-credential"
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
 * Replaces the `AdminGuard` 403 page and the `HeygenGuard` 424 page.
 * Shown whenever the current user lacks what a non-community route
 * needs: platform-admin rights OR a HeyGen credential on the tenant.
 * Platform admins on a tenant with a HeyGen key render nothing.
 *
 * Two modes:
 *  - **Controlled**: pass `open` + `onClose` (the sidebar opens it when
 *    a gated tab is clicked; the navigation is cancelled, page stays).
 *  - **Uncontrolled**: omit props — it self-opens once on mount
 *    (conditional-layout fallback for a direct hit / refresh on a
 *    non-community route).
 *
 * Renders nothing while admin/HeyGen state is still resolving so it
 * doesn't flash for fully-credentialed users.
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
  const heygen = useHasHeygenCredential()
  const [resolved, setResolved] = useState(false)
  const [openState, setOpenState] = useState(true)

  useEffect(() => {
    const id = window.setTimeout(() => setResolved(true), 0)
    return () => window.clearTimeout(id)
  }, [])

  // Wait for both checks to settle so we never flash the modal at
  // someone who actually has full access.
  if (!resolved || heygen === "checking") return null

  const tenant = resolveAppTenant()
  const email = currentUserEmail()
  const needsAccess = !isAdmin || heygen === "missing"

  if (!needsAccess || !email) return null

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
