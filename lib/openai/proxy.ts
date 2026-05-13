/**
 * OpenAI proxy client (browser).
 *
 * All requests go through `/api/openai/<path>` — our same-origin server
 * proxy that resolves the tenant's OpenAI key via ibl.ai's ai-account
 * service. The browser never sees the key; it only presents its ibl.ai
 * DM token so the server can look up the right credential.
 */
import { resolveAppTenant } from "@/lib/iblai/tenant";

const API_BASE = "/api/openai";

function getDmToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("dm_token") ?? "";
}

/**
 * Build the headers the OpenAI proxy expects. Always returns an
 * `Authorization: Token <dm_token>` and `X-Platform: <tenant>` pair.
 * Throws if either is missing — callers should surface the error to
 * the user the same way they would for a missing API key.
 */
export function openaiProxyAuthHeaders(): {
  Authorization: string;
  "X-Platform": string;
} {
  const token = getDmToken();
  if (!token) throw new Error("openai: missing DM token (user not authenticated)");
  const platform = resolveAppTenant();
  if (!platform) throw new Error("openai: no tenant resolved");
  return {
    Authorization: `Token ${token}`,
    "X-Platform": platform,
  };
}

/** Same-origin URL for an OpenAI REST path, e.g. `v1/chat/completions`. */
export function openaiProxyUrl(path: string): string {
  return `${API_BASE}/${path.replace(/^\/+/, "")}`;
}
