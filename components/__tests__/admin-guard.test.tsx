import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

let mockedIsAdmin = false;

vi.mock("@/hooks/use-is-admin", () => ({
  useIsAdmin: () => mockedIsAdmin,
}));
vi.mock("@/components/app-header", () => ({
  AppHeader: () => <div data-testid="app-header" />,
}));
vi.mock("@/components/footer", () => ({
  Footer: () => <div data-testid="footer" />,
}));

import { AdminGuard } from "@/components/admin-guard";

describe("AdminGuard", () => {
  beforeEach(() => {
    mockedIsAdmin = false;
  });
  afterEach(() => {
    mockedIsAdmin = false;
  });

  it("renders nothing until the resolve tick fires", () => {
    mockedIsAdmin = true;
    const { container } = render(
      <AdminGuard>
        <div>guarded content</div>
      </AdminGuard>,
    );
    // Before the 0ms timeout resolves, the guard returns null.
    expect(container).toBeEmptyDOMElement();
  });

  it("renders children once resolved and admin=true", async () => {
    mockedIsAdmin = true;
    render(
      <AdminGuard>
        <div>guarded content</div>
      </AdminGuard>,
    );
    await waitFor(() =>
      expect(screen.getByText("guarded content")).toBeInTheDocument(),
    );
  });

  it("shows the admin-required gate when admin=false", async () => {
    mockedIsAdmin = false;
    render(
      <AdminGuard>
        <div>guarded content</div>
      </AdminGuard>,
    );
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /admin access required/i }),
      ).toBeInTheDocument(),
    );
    expect(screen.queryByText("guarded content")).not.toBeInTheDocument();
    expect(screen.getByText("403")).toBeInTheDocument();
    const contact = screen.getByRole("link", { name: /contact ibl\.ai/i });
    expect(contact).toHaveAttribute("href", "https://ibl.ai/contact");
    expect(contact).toHaveAttribute("target", "_blank");
    // Header + footer chrome stay mounted so the user can switch tenants
    // or log out from the profile dropdown.
    expect(screen.getByTestId("app-header")).toBeInTheDocument();
    expect(screen.getByTestId("footer")).toBeInTheDocument();
  });
});
