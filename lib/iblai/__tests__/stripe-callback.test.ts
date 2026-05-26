import { describe, it, expect } from "vitest";

import {
  STRIPE_CALLBACK_PARAMS,
  hasStripeCheckoutMarker,
  parseStripeCallback,
  stripStripeCallbackParams,
} from "@/lib/iblai/stripe-callback";

const FULL_CALLBACK =
  "?platform_key=newtenant" +
  "&stripe_checkout_id=cs_test_abc" +
  "&email=jane%40example.com" +
  "&exists=true";

describe("STRIPE_CALLBACK_PARAMS", () => {
  it("covers every documented Stripe callback param", () => {
    expect([...STRIPE_CALLBACK_PARAMS]).toEqual([
      "platform_key",
      "stripe_checkout_id",
      "email",
      "exists",
    ]);
  });
});

describe("hasStripeCheckoutMarker", () => {
  it("returns false on an empty search string", () => {
    expect(hasStripeCheckoutMarker("")).toBe(false);
  });

  it("returns false when only ancillary params are present", () => {
    expect(hasStripeCheckoutMarker("?platform_key=x&email=y&exists=true")).toBe(
      false,
    );
  });

  it("returns true when stripe_checkout_id is set (with or without leading '?')", () => {
    expect(hasStripeCheckoutMarker("?stripe_checkout_id=abc")).toBe(true);
    expect(hasStripeCheckoutMarker("stripe_checkout_id=abc")).toBe(true);
  });

  it("does not match a different param that contains the marker as a substring", () => {
    expect(hasStripeCheckoutMarker("?stripe_checkout_id_extra=abc")).toBe(false);
  });
});

describe("parseStripeCallback", () => {
  it("returns null when stripe_checkout_id is missing", () => {
    expect(
      parseStripeCallback("?platform_key=newtenant&exists=true"),
    ).toBeNull();
  });

  it("returns null when platform_key is missing", () => {
    expect(
      parseStripeCallback("?stripe_checkout_id=abc&exists=true"),
    ).toBeNull();
  });

  it("returns null on an empty search string", () => {
    expect(parseStripeCallback("")).toBeNull();
  });

  it("parses every documented field, decoding the email", () => {
    expect(parseStripeCallback(FULL_CALLBACK)).toEqual({
      platformKey: "newtenant",
      checkoutId: "cs_test_abc",
      email: "jane@example.com",
      exists: true,
    });
  });

  it("treats `exists` as boolean false unless it equals the string 'true'", () => {
    const cb = parseStripeCallback(
      "?platform_key=t&stripe_checkout_id=cs&exists=false",
    );
    expect(cb?.exists).toBe(false);
  });

  it("tolerates a missing email by returning null for that field", () => {
    const cb = parseStripeCallback(
      "?platform_key=t&stripe_checkout_id=cs&exists=true",
    );
    expect(cb?.email).toBeNull();
  });
});

describe("stripStripeCallbackParams", () => {
  it("returns the URL unchanged when no callback params are present", () => {
    const href = "https://app.test/page?other=keep";
    expect(stripStripeCallbackParams(href)).toBe(href);
  });

  it("strips every documented callback param", () => {
    const stripped = stripStripeCallbackParams(
      `https://app.test/page${FULL_CALLBACK}`,
    );
    const url = new URL(stripped);
    for (const k of STRIPE_CALLBACK_PARAMS) {
      expect(url.searchParams.has(k)).toBe(false);
    }
  });

  it("preserves unrelated query params, the path, and the hash", () => {
    const stripped = stripStripeCallbackParams(
      `https://app.test/page?tab=info${FULL_CALLBACK.replace("?", "&")}#anchor`,
    );
    const url = new URL(stripped);
    expect(url.pathname).toBe("/page");
    expect(url.hash).toBe("#anchor");
    expect(url.searchParams.get("tab")).toBe("info");
  });

  it("is idempotent when re-applied to its own output", () => {
    const once = stripStripeCallbackParams(
      `https://app.test/page${FULL_CALLBACK}`,
    );
    const twice = stripStripeCallbackParams(once);
    expect(twice).toBe(once);
  });
});
