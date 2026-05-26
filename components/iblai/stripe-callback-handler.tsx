"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

import { resolveAppTenant } from "@/lib/iblai/tenant";
import { handleTenantSwitch } from "@/lib/iblai/auth-utils";
import {
  parseStripeCallback,
  stripStripeCallbackParams,
} from "@/lib/iblai/stripe-callback";

/**
 * Stripe-checkout callback handler.
 *
 * After a successful Stripe upgrade the SDK redirects back to the page
 * the user came from with the query params:
 *
 *   ?platform_key=<new-tenant>&stripe_checkout_id=<uuid>
 *   &email=<account-email>&exists=true
 *
 * The new tenant isn't in localStorage yet — the user is still scoped
 * to whichever tenant they checked out from. We bounce them through
 * the auth SPA via `handleTenantSwitch` so fresh tokens get issued for
 * the new tenant, then land back on the same page with the stripe
 * params stripped.
 *
 * No-op when the params aren't present, or when `platform_key` already
 * matches the active tenant (just strips the params).
 */
export function StripeCallbackHandler() {
  const searchParams = useSearchParams();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    if (typeof window === "undefined") return;

    const callback = parseStripeCallback(searchParams.toString());
    if (!callback) return;

    handled.current = true;

    if (callback.platformKey === resolveAppTenant()) {
      const cleaned = stripStripeCallbackParams(window.location.href);
      if (cleaned !== window.location.href) {
        window.history.replaceState({}, "", cleaned);
      }
      return;
    }

    const redirectUrl = stripStripeCallbackParams(window.location.href);
    handleTenantSwitch(callback.platformKey, { redirectUrl });
  }, [searchParams]);

  return null;
}
