import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

let mockedTenant = "old-tenant";
let mockedSearchParams = new URLSearchParams();
const handleTenantSwitchMock = vi.fn();

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockedSearchParams,
}));
vi.mock("@/lib/iblai/tenant", () => ({
  resolveAppTenant: () => mockedTenant,
}));
vi.mock("@/lib/iblai/auth-utils", () => ({
  handleTenantSwitch: (...args: unknown[]) => handleTenantSwitchMock(...args),
}));

import { StripeCallbackHandler } from "@/components/iblai/stripe-callback-handler";

function setSearch(search: string) {
  // Strip the leading '?' if present for replaceState consistency.
  const clean = search.startsWith("?") ? search.slice(1) : search;
  window.history.replaceState({}, "", `/page${clean ? "?" + clean : ""}`);
  mockedSearchParams = new URLSearchParams(clean);
}

describe("StripeCallbackHandler", () => {
  beforeEach(() => {
    handleTenantSwitchMock.mockReset();
    mockedTenant = "old-tenant";
    mockedSearchParams = new URLSearchParams();
    window.history.replaceState({}, "", "/page");
  });

  afterEach(() => {
    window.history.replaceState({}, "", "/");
  });

  it("renders nothing visible to the DOM", () => {
    const { container } = render(<StripeCallbackHandler />);
    expect(container).toBeEmptyDOMElement();
  });

  it("does not trigger a tenant switch when no stripe params are present", () => {
    render(<StripeCallbackHandler />);
    expect(handleTenantSwitchMock).not.toHaveBeenCalled();
  });

  it("does not trigger when only platform_key is present (no checkout marker)", () => {
    setSearch("platform_key=newtenant");
    render(<StripeCallbackHandler />);
    expect(handleTenantSwitchMock).not.toHaveBeenCalled();
  });

  it("does not trigger when only stripe_checkout_id is present (no platform_key)", () => {
    setSearch("stripe_checkout_id=cs_test");
    render(<StripeCallbackHandler />);
    expect(handleTenantSwitchMock).not.toHaveBeenCalled();
  });

  it("strips the callback params from the URL when platform_key matches the active tenant", () => {
    mockedTenant = "newtenant";
    setSearch(
      "platform_key=newtenant&stripe_checkout_id=cs_test&email=a%40b.com&exists=true",
    );
    render(<StripeCallbackHandler />);
    expect(handleTenantSwitchMock).not.toHaveBeenCalled();
    expect(window.location.search).toBe("");
  });

  it("preserves unrelated query params when stripping the callback marker", () => {
    mockedTenant = "newtenant";
    setSearch("tab=info&platform_key=newtenant&stripe_checkout_id=cs_test");
    render(<StripeCallbackHandler />);
    expect(window.location.search).toBe("?tab=info");
  });

  it("triggers a tenant switch when platform_key differs from the active tenant", () => {
    mockedTenant = "old-tenant";
    setSearch(
      "platform_key=newtenant&stripe_checkout_id=cs_test&email=a%40b.com&exists=true",
    );
    render(<StripeCallbackHandler />);
    expect(handleTenantSwitchMock).toHaveBeenCalledTimes(1);
    const [tenant, opts] = handleTenantSwitchMock.mock.calls[0];
    expect(tenant).toBe("newtenant");
    // The redirectUrl strips every stripe-callback param but keeps the path.
    expect(opts.redirectUrl).not.toMatch(/stripe_checkout_id/);
    expect(opts.redirectUrl).not.toMatch(/platform_key/);
    expect(opts.redirectUrl).not.toMatch(/exists/);
    expect(opts.redirectUrl).toMatch(/\/page$/);
  });

  it("fires the switch at most once even on re-renders", () => {
    mockedTenant = "old-tenant";
    setSearch("platform_key=newtenant&stripe_checkout_id=cs_test");
    const { rerender } = render(<StripeCallbackHandler />);
    rerender(<StripeCallbackHandler />);
    rerender(<StripeCallbackHandler />);
    expect(handleTenantSwitchMock).toHaveBeenCalledTimes(1);
  });
});
