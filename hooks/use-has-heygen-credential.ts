"use client"

import { useEffect, useState } from "react"

import config from "@/lib/iblai/config"
import { resolveAppTenant } from "@/lib/iblai/tenant"

export type HeygenCredentialState = "checking" | "ok" | "missing"

/**
 * Module-level cache so the network probe runs once per session even
 * if several components (sidebar, layout, modal) hook into it. The
 * promise resolves to "ok" when the tenant has a non-empty HeyGen
 * integration credential, otherwise "missing".
 */
let cached: Promise<HeygenCredentialState> | null = null

function check(): Promise<HeygenCredentialState> {
  if (cached) return cached
  cached = (async (): Promise<HeygenCredentialState> => {
    if (typeof window === "undefined") return "missing"
    const token = localStorage.getItem("dm_token")
    const tenant = resolveAppTenant()
    if (!token || !tenant) return "missing"

    const url =
      `${config.dmUrl()}/api/ai-account/orgs/${encodeURIComponent(tenant)}` +
      `/integration-credential/?name=heygen`
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Token ${token}`,
          Accept: "application/json",
        },
      })
      if (!res.ok) return "missing"
      const data = await res.json()
      if (!Array.isArray(data)) return "missing"
      const present = data.some(
        (entry) =>
          entry &&
          (entry.name === "heygen" || entry.name === "heygen-private") &&
          typeof entry.value?.key === "string" &&
          entry.value.key.length > 0,
      )
      return present ? "ok" : "missing"
    } catch {
      return "missing"
    }
  })()
  return cached
}

/**
 * Reports whether the current tenant has a HeyGen credential
 * configured. Replaces `HeygenGuard`'s in-page swap: callers use this
 * to decide whether to surface the upgrade modal instead.
 */
export function useHasHeygenCredential(): HeygenCredentialState {
  const [state, setState] = useState<HeygenCredentialState>("checking")
  useEffect(() => {
    let cancelled = false
    check().then((s) => {
      if (!cancelled) setState(s)
    })
    return () => {
      cancelled = true
    }
  }, [])
  return state
}
