"use client"

import { useEffect, useState } from "react"
import { UpgradePackageModal } from "@iblai/iblai-js/web-containers"

import { useIsAdmin } from "@/hooks/use-is-admin"
import { useHasHeygenCredential } from "@/hooks/use-has-heygen-credential"
import { resolveAppTenant } from "@/lib/iblai/tenant"
import { hasStripeCheckoutMarker } from "@/lib/iblai/stripe-callback"
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

/** Non-empty `tenants` localStorage means the SDK has hydrated the list. */
function hasTenantsData(): boolean {
  if (typeof window === "undefined") return false
  try {
    const raw = localStorage.getItem("tenants")
    if (!raw) return false
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.length > 0
    // Tolerate single-object shape (matches useIsAdmin's coercion).
    return typeof parsed === "object" && parsed !== null
  } catch {
    return false
  }
}

/**
 * True while a Stripe-checkout return / cross-SPA tenant switch is in
 * flight. Suppresses the modal during the brief window where the user
 * has landed on the new tenant but the SDK hasn't finished refreshing
 * the tenants list yet (and `useIsAdmin` would briefly return false).
 */
function isCallbackInFlight(): boolean {
  if (typeof window === "undefined") return false
  if (
    typeof document !== "undefined" &&
    document.cookie.includes("ibl_tenant_switching")
  ) {
    return true
  }
  return hasStripeCheckoutMarker(window.location.search)
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
  const [tenantsReady, setTenantsReady] = useState(() => hasTenantsData())
  const [openState, setOpenState] = useState(true)

  // Wait for `localStorage.tenants` to populate. After a Stripe upgrade
  // the tenant switch wipes localStorage; until the SDK refetches the
  // tenants list, `useIsAdmin` returns false and the modal would flash
  // for users who are admins of the freshly-purchased tenant.
  useEffect(() => {
    if (tenantsReady) return
    let cancelled = false
    let attempts = 0
    const id = window.setInterval(() => {
      attempts += 1
      if (cancelled) return
      if (hasTenantsData() || attempts >= 40) {
        setTenantsReady(true)
        window.clearInterval(id)
      }
    }, 50)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [tenantsReady])

  // Wait for both checks to settle so we never flash the modal at
  // someone who actually has full access. `tenantsReady` covers the
  // post-tenant-switch window; `isCallbackInFlight` covers the brief
  // moment between Stripe redirect arrival and the StripeCallbackHandler
  // bouncing the user through the auth SPA.
  if (!tenantsReady || heygen === "checking") return null
  if (isCallbackInFlight()) return null

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
        typeof window !== "undefined" ? window.location.href : ""
      }
      mainPlatformKey={PUBLIC_VIDEO_TENANT}
      sourcePlatformKey={tenant}
      currentUserEmail={email}
    />
  )
}
