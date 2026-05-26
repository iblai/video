import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

let mockedIsAdmin = false;
type HeygenState = "checking" | "ok" | "missing";
let mockedHeygen: HeygenState = "missing";

vi.mock("@/hooks/use-is-admin", () => ({
  useIsAdmin: () => mockedIsAdmin,
}));
vi.mock("@/hooks/use-has-heygen-credential", () => ({
  useHasHeygenCredential: () => mockedHeygen,
}));
vi.mock("@/lib/iblai/tenant", () => ({
  resolveAppTenant: () => "acme",
}));
vi.mock("@/lib/iblai/catalog", () => ({
  PUBLIC_VIDEO_TENANT: "main",
}));
vi.mock("@iblai/iblai-js/web-containers", () => ({
  UpgradePackageModal: (props: Record<string, unknown>) => (
    <div
      data-testid="upgrade-package-modal"
      data-open={String(props.open ?? "")}
      data-redirect-url={String(props.redirectUrl ?? "")}
      data-main-platform-key={String(props.mainPlatformKey ?? "")}
      data-source-platform-key={String(props.sourcePlatformKey ?? "")}
      data-current-user-email={String(props.currentUserEmail ?? "")}
    />
  ),
}));

import { UpdateSubscriptionModal } from "@/components/iblai/update-subscription-modal";

function setUserData(email = "alice@example.com") {
  localStorage.setItem(
    "userData",
    JSON.stringify({ user_email: email, user_nicename: "alice" }),
  );
}

function setTenants(admin: boolean) {
  localStorage.setItem(
    "tenants",
    JSON.stringify([{ key: "acme", is_admin: admin }]),
  );
}

function clearCookie(name: string) {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
}

describe("UpdateSubscriptionModal", () => {
  beforeEach(() => {
    mockedIsAdmin = false;
    mockedHeygen = "missing";
    localStorage.clear();
    clearCookie("ibl_tenant_switching");
    window.history.replaceState({}, "", "/");
  });

  afterEach(() => {
    localStorage.clear();
    clearCookie("ibl_tenant_switching");
  });

  it("renders null while `tenants` localStorage is empty", () => {
    setUserData();
    const { container } = render(<UpdateSubscriptionModal />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders null while heygen check is still in flight", () => {
    setUserData();
    setTenants(false);
    mockedHeygen = "checking";
    const { container } = render(<UpdateSubscriptionModal />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the SDK modal when admin=false and heygen=missing", () => {
    setUserData();
    setTenants(false);
    mockedHeygen = "missing";
    render(<UpdateSubscriptionModal />);
    expect(screen.getByTestId("upgrade-package-modal")).toBeInTheDocument();
  });

  it("renders null when the user has full access (admin + heygen=ok)", () => {
    setUserData();
    setTenants(true);
    mockedIsAdmin = true;
    mockedHeygen = "ok";
    const { container } = render(<UpdateSubscriptionModal />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the SDK modal when heygen is missing even if user is admin", () => {
    setUserData();
    setTenants(true);
    mockedIsAdmin = true;
    mockedHeygen = "missing";
    render(<UpdateSubscriptionModal />);
    expect(screen.getByTestId("upgrade-package-modal")).toBeInTheDocument();
  });

  it("renders the SDK modal when user is not admin even if heygen=ok", () => {
    setUserData();
    setTenants(false);
    mockedIsAdmin = false;
    mockedHeygen = "ok";
    render(<UpdateSubscriptionModal />);
    expect(screen.getByTestId("upgrade-package-modal")).toBeInTheDocument();
  });

  it("suppresses the modal when the URL has a stripe_checkout_id marker", () => {
    setUserData();
    setTenants(false);
    mockedHeygen = "missing";
    window.history.replaceState({}, "", "/?stripe_checkout_id=cs_test");
    const { container } = render(<UpdateSubscriptionModal />);
    expect(container).toBeEmptyDOMElement();
  });

  it("suppresses the modal while the ibl_tenant_switching cookie is set", () => {
    setUserData();
    setTenants(false);
    mockedHeygen = "missing";
    document.cookie = "ibl_tenant_switching=true;path=/";
    const { container } = render(<UpdateSubscriptionModal />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders null when no email is available in userData", () => {
    // userData not set
    setTenants(false);
    mockedHeygen = "missing";
    const { container } = render(<UpdateSubscriptionModal />);
    expect(container).toBeEmptyDOMElement();
  });

  it("passes window.location.href as redirectUrl to the SDK modal", () => {
    setUserData();
    setTenants(false);
    mockedHeygen = "missing";
    window.history.replaceState({}, "", "/some-page?foo=bar");
    render(<UpdateSubscriptionModal />);
    const el = screen.getByTestId("upgrade-package-modal");
    expect(el.getAttribute("data-redirect-url")).toBe(window.location.href);
    expect(el.getAttribute("data-redirect-url")).toMatch(/foo=bar/);
  });

  it("passes the resolved tenant and the public main tenant key to the SDK modal", () => {
    setUserData();
    setTenants(false);
    mockedHeygen = "missing";
    render(<UpdateSubscriptionModal />);
    const el = screen.getByTestId("upgrade-package-modal");
    expect(el.getAttribute("data-source-platform-key")).toBe("acme");
    expect(el.getAttribute("data-main-platform-key")).toBe("main");
    expect(el.getAttribute("data-current-user-email")).toBe("alice@example.com");
  });

  it("falls back to email field when user_email is missing", () => {
    localStorage.setItem(
      "userData",
      JSON.stringify({ email: "bob@example.com" }),
    );
    setTenants(false);
    mockedHeygen = "missing";
    render(<UpdateSubscriptionModal />);
    const el = screen.getByTestId("upgrade-package-modal");
    expect(el.getAttribute("data-current-user-email")).toBe("bob@example.com");
  });

  it("starts rendering the modal once `tenants` localStorage is populated post-mount", async () => {
    setUserData();
    // No tenants yet — modal should stay closed.
    mockedHeygen = "missing";
    render(<UpdateSubscriptionModal />);
    expect(screen.queryByTestId("upgrade-package-modal")).not.toBeInTheDocument();

    // Populate tenants — the modal's 50ms poll picks it up.
    setTenants(false);
    await waitFor(
      () => expect(screen.getByTestId("upgrade-package-modal")).toBeInTheDocument(),
      { timeout: 3000 },
    );
  });

  it("forwards `open={false}` to the SDK modal in controlled mode", () => {
    setUserData();
    setTenants(false);
    mockedHeygen = "missing";
    render(<UpdateSubscriptionModal open={false} onClose={vi.fn()} />);
    expect(screen.getByTestId("upgrade-package-modal").getAttribute("data-open")).toBe(
      "false",
    );
  });

  it("forwards `open={true}` to the SDK modal in controlled mode", () => {
    setUserData();
    setTenants(false);
    mockedHeygen = "missing";
    render(<UpdateSubscriptionModal open={true} onClose={vi.fn()} />);
    expect(screen.getByTestId("upgrade-package-modal").getAttribute("data-open")).toBe(
      "true",
    );
  });

  it("defaults to `open=true` in uncontrolled mode", () => {
    setUserData();
    setTenants(false);
    mockedHeygen = "missing";
    render(<UpdateSubscriptionModal />);
    expect(screen.getByTestId("upgrade-package-modal").getAttribute("data-open")).toBe(
      "true",
    );
  });
});
