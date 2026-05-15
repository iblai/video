import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const toggleSidebarMock = vi.fn();
const pushMock = vi.fn();
let mockedIsMobile = false;

vi.mock("@/components/ui/sidebar", () => ({
  useSidebar: () => ({
    toggleSidebar: toggleSidebarMock,
    isMobile: mockedIsMobile,
  }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));
vi.mock("@/components/iblai/profile-dropdown", () => ({
  ProfileDropdown: () => <div data-testid="profile-dropdown" />,
}));
vi.mock("@/components/iblai/notification-bell", () => ({
  IblaiNotificationBell: ({ onViewAll }: { onViewAll: () => void }) => (
    <button data-testid="bell" onClick={onViewAll} />
  ),
}));
vi.mock("@/components/iblai/credit-balance", () => ({
  IblaiCreditBalance: () => <div data-testid="credit-balance" />,
}));

import { AppHeader } from "@/components/app-header";

describe("AppHeader", () => {
  beforeEach(() => {
    toggleSidebarMock.mockReset();
    pushMock.mockReset();
    mockedIsMobile = false;
  });
  afterEach(() => {
    mockedIsMobile = false;
  });

  it("hides the menu toggle on desktop", () => {
    render(<AppHeader />);
    // Only the bell button is in the tree on desktop.
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getByTestId("profile-dropdown")).toBeInTheDocument();
  });

  it("shows the menu toggle on mobile and wires toggleSidebar", () => {
    mockedIsMobile = true;
    render(<AppHeader />);
    // 2 buttons: the menu toggle (first) and the bell (second).
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(2);
    fireEvent.click(buttons[0]);
    expect(toggleSidebarMock).toHaveBeenCalledTimes(1);
  });

  it("notification bell onViewAll navigates to /notifications", () => {
    render(<AppHeader />);
    fireEvent.click(screen.getByTestId("bell"));
    expect(pushMock).toHaveBeenCalledWith("/notifications");
  });
});
