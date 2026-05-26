/**
 * Pure URL helpers for the Stripe-checkout callback flow.
 *
 * After a successful Stripe upgrade the SDK redirects back to the page
 * the user came from with the query params:
 *
 *   ?platform_key=<new-tenant>&stripe_checkout_id=<uuid>
 *   &email=<account-email>&exists=true
 *
 * These helpers detect and strip those params so the post-handler URL
 * is clean (no transient state leaking into history / bookmarks).
 *
 * Pure functions only — no `window` / `document` access. The component
 * layer (`<StripeCallbackHandler />`, `<UpdateSubscriptionModal />`)
 * calls these against `window.location.href` / `.search`.
 */

export const STRIPE_CALLBACK_PARAMS = [
  "platform_key",
  "stripe_checkout_id",
  "email",
  "exists",
] as const;

/** Return `href` with every Stripe-callback param stripped. */
export function stripStripeCallbackParams(href: string): string {
  const url = new URL(href);
  for (const k of STRIPE_CALLBACK_PARAMS) url.searchParams.delete(k);
  return url.toString();
}

/**
 * True when the search string carries the marker param the SDK appends
 * on success (`stripe_checkout_id`). Other params (`platform_key`,
 * `email`, `exists`) can appear in unrelated flows, so the marker is
 * the authoritative signal.
 */
export function hasStripeCheckoutMarker(search: string): boolean {
  return new URLSearchParams(search).has("stripe_checkout_id");
}

export interface StripeCallback {
  platformKey: string;
  checkoutId: string;
  email: string | null;
  exists: boolean;
}

/**
 * Parse a Stripe-callback search string. Returns `null` when the
 * marker (`stripe_checkout_id`) or `platform_key` is missing — both
 * are required for the handler to act.
 */
export function parseStripeCallback(search: string): StripeCallback | null {
  const params = new URLSearchParams(search);
  const checkoutId = params.get("stripe_checkout_id");
  const platformKey = params.get("platform_key");
  if (!checkoutId || !platformKey) return null;
  return {
    platformKey,
    checkoutId,
    email: params.get("email"),
    exists: params.get("exists") === "true",
  };
}
