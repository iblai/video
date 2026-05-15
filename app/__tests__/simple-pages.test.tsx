import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";

const redirectMock = vi.fn();
const hasNonExpiredAuthTokenMock = vi.fn();
const replaceMock = vi.fn();
const backMock = vi.fn();
let mockedTenant = "acme";

vi.mock("@/lib/iblai/auth-utils", () => ({
  redirectToAuthSpa: (...a: unknown[]) => redirectMock(...a),
  hasNonExpiredAuthToken: () => hasNonExpiredAuthTokenMock(),
}));
vi.mock("@/lib/iblai/tenant", () => ({
  resolveAppTenant: () => mockedTenant,
}));
vi.mock("@/lib/iblai/config", () => ({
  default: {
    authUrl: () => "https://auth.test",
    mainTenantKey: () => "main",
  },
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, back: backMock, push: vi.fn() }),
}));
vi.mock("@iblai/iblai-js/web-containers", () => ({
  NotificationDisplay: () => <div data-testid="notification-display" />,
  SsoLogin: () => <div data-testid="sso-login" />,
  Loader: () => <div data-testid="loader" />,
}));
vi.mock("@iblai/iblai-js/web-containers/next", () => ({
  Account: () => <div data-testid="account" />,
  SsoLogin: () => <div data-testid="sso-login" />,
}));
vi.mock("@/components/video-generator", () => ({
  VideoGenerator: () => <div data-testid="video-generator" />,
}));

import HomePage from "@/app/page";
import LoginPage from "@/app/login/page";
import VideoCreatePage from "@/app/videos/generate/page";
import NotificationsPage from "@/app/notifications/page";
import AccountPage from "@/app/account/page";
import SsoLoginCompletePage from "@/app/sso-login-complete/page";
import NotificationsLoading from "@/app/notifications/loading";
import CommunityLoading from "@/app/community/loading";
import PublicVideoClipsLoading from "@/app/videos/public-video-clips/loading";

describe("HomePage", () => {
  beforeEach(() => {
    redirectMock.mockReset();
    hasNonExpiredAuthTokenMock.mockReset();
    replaceMock.mockReset();
  });
  afterEach(() => {
    redirectMock.mockReset();
  });

  it("redirects to the auth SPA when no token is available", async () => {
    hasNonExpiredAuthTokenMock.mockReturnValue(false);
    render(<HomePage />);
    expect(redirectMock).toHaveBeenCalled();
  });

  it("redirects to /ai-avatar/generate when authenticated", async () => {
    hasNonExpiredAuthTokenMock.mockReturnValue(true);
    render(<HomePage />);
    expect(replaceMock).toHaveBeenCalledWith("/ai-avatar/generate");
  });

  it("shows the redirecting placeholder", () => {
    hasNonExpiredAuthTokenMock.mockReturnValue(true);
    render(<HomePage />);
    expect(screen.getByText(/redirecting/i)).toBeInTheDocument();
  });
});

describe("LoginPage", () => {
  beforeEach(() => {
    redirectMock.mockReset();
  });

  it("invokes redirectToAuthSpa on mount", () => {
    render(<LoginPage />);
    expect(redirectMock).toHaveBeenCalled();
  });

  it("renders the redirecting message", () => {
    render(<LoginPage />);
    expect(screen.getByText(/redirecting to login/i)).toBeInTheDocument();
  });
});

describe("VideoCreatePage", () => {
  it("renders the VideoGenerator", () => {
    render(<VideoCreatePage />);
    expect(screen.getByTestId("video-generator")).toBeInTheDocument();
  });
});

describe("NotificationsPage", () => {
  beforeEach(() => {
    localStorage.clear();
    mockedTenant = "acme";
  });
  afterEach(() => {
    localStorage.clear();
  });

  it("renders nothing without userData", () => {
    const { container } = render(<NotificationsPage />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the SDK display when both tenant and userData are present", () => {
    localStorage.setItem(
      "userData",
      JSON.stringify({ user_nicename: "alice" }),
    );
    localStorage.setItem(
      "tenants",
      JSON.stringify([{ key: "acme", is_admin: true }]),
    );
    render(<NotificationsPage />);
    expect(screen.getByTestId("notification-display")).toBeInTheDocument();
  });
});

describe("AccountPage", () => {
  beforeEach(() => {
    localStorage.clear();
    mockedTenant = "acme";
  });

  it("renders loading while ready=false (no tenant)", () => {
    mockedTenant = "";
    render(<AccountPage />);
    expect(screen.getByText(/loading account settings/i)).toBeInTheDocument();
  });

  it("renders the SDK Account container once data is ready", () => {
    localStorage.setItem(
      "userData",
      JSON.stringify({ user_nicename: "alice" }),
    );
    localStorage.setItem(
      "tenants",
      JSON.stringify([{ key: "acme", is_admin: true }]),
    );
    render(<AccountPage />);
    expect(screen.getByTestId("account")).toBeInTheDocument();
  });
});

describe("SsoLoginCompletePage", () => {
  it("renders the SDK SsoLogin component", () => {
    render(<SsoLoginCompletePage />);
    // The Suspense fallback may resolve to either "Completing login…" or the
    // sso-login test id depending on render order.
    expect(
      screen.queryByTestId("sso-login") ||
        screen.queryByText(/completing login/i),
    ).not.toBeNull();
  });
});

describe("loading skeletons", () => {
  it.each([
    ["notifications", NotificationsLoading],
    ["community", CommunityLoading],
    ["public-video-clips", PublicVideoClipsLoading],
  ])("%s loading renders", (_name, Component) => {
    const { container } = render(<Component />);
    expect(container.firstChild).not.toBeNull();
  });
});
