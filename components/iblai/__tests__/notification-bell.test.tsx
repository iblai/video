import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

let mockedTenant = "acme";

vi.mock("@/lib/iblai/tenant", () => ({
  resolveAppTenant: () => mockedTenant,
}));
vi.mock("@iblai/iblai-js/web-containers", () => ({
  NotificationDropdown: (props: Record<string, unknown>) => (
    <div data-testid="notification-dropdown" data-props={JSON.stringify(props)} />
  ),
}));

import { IblaiNotificationBell } from "@/components/iblai/notification-bell";

describe("IblaiNotificationBell", () => {
  beforeEach(() => {
    localStorage.clear();
    mockedTenant = "acme";
  });
  afterEach(() => {
    localStorage.clear();
  });

  it("renders nothing when tenant is missing", () => {
    mockedTenant = "";
    const { container } = render(<IblaiNotificationBell />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when no userData is in localStorage", () => {
    const { container } = render(<IblaiNotificationBell />);
    expect(container).toBeEmptyDOMElement();
  });

  it("passes tenant + username through to the SDK dropdown", () => {
    localStorage.setItem(
      "userData",
      JSON.stringify({ user_nicename: "alice" }),
    );
    const onViewAll = vi.fn();
    render(<IblaiNotificationBell onViewAll={onViewAll} className="my-cls" />);
    const node = screen.getByTestId("notification-dropdown");
    const props = JSON.parse(node.getAttribute("data-props") ?? "{}");
    expect(props.org).toBe("acme");
    expect(props.userId).toBe("alice");
    expect(props.className).toBe("my-cls");
  });

  it("tolerates malformed userData JSON", () => {
    localStorage.setItem("userData", "{not-json");
    const { container } = render(<IblaiNotificationBell />);
    expect(container).toBeEmptyDOMElement();
  });
});
