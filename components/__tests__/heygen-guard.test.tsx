import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

vi.mock("@/lib/iblai/config", () => ({
  default: { dmUrl: () => "https://dm.test" },
}));
vi.mock("@/lib/iblai/tenant", () => ({
  resolveAppTenant: () => mockedTenant,
}));
vi.mock("@/components/app-header", () => ({
  AppHeader: () => <div data-testid="app-header" />,
}));
vi.mock("@/components/footer", () => ({
  Footer: () => <div data-testid="footer" />,
}));

let mockedTenant = "acme";

import { HeygenGuard } from "@/components/heygen-guard";

describe("HeygenGuard", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    localStorage.clear();
    mockedTenant = "acme";
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });
  afterEach(() => {
    localStorage.clear();
    fetchSpy.mockRestore();
  });

  it("renders nothing while the credential probe is in flight", () => {
    localStorage.setItem("dm_token", "tok");
    fetchSpy.mockImplementation(
      () => new Promise(() => {/* never resolves */}),
    );
    const { container } = render(
      <HeygenGuard>
        <div>app shell</div>
      </HeygenGuard>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders children when a heygen credential is present", async () => {
    localStorage.setItem("dm_token", "tok");
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          { name: "heygen", value: { key: "hg-key" }, platform: "acme" },
        ]),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    render(
      <HeygenGuard>
        <div>app shell</div>
      </HeygenGuard>,
    );
    await waitFor(() =>
      expect(screen.getByText("app shell")).toBeInTheDocument(),
    );
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/ai-account/orgs/acme/integration-credential/");
    expect(url).toContain("name=heygen");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Token tok",
    );
  });

  it("renders the missing-credential gate when no heygen entry exists", async () => {
    localStorage.setItem("dm_token", "tok");
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify([]), { status: 200 }),
    );
    render(
      <HeygenGuard>
        <div>app shell</div>
      </HeygenGuard>,
    );
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /heygen integration required/i }),
      ).toBeInTheDocument(),
    );
    expect(screen.queryByText("app shell")).not.toBeInTheDocument();
    expect(screen.getByText("424")).toBeInTheDocument();
    const contact = screen.getByRole("link", { name: /contact ibl\.ai/i });
    expect(contact).toHaveAttribute("href", "https://ibl.ai/contact");
    // Header + footer chrome stay mounted so the user can switch tenants
    // or log out from the profile dropdown.
    expect(screen.getByTestId("app-header")).toBeInTheDocument();
    expect(screen.getByTestId("footer")).toBeInTheDocument();
  });

  it("renders the missing-credential gate when the credential has an empty key", async () => {
    localStorage.setItem("dm_token", "tok");
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify([{ name: "heygen", value: { key: "" } }]),
        { status: 200 },
      ),
    );
    render(
      <HeygenGuard>
        <div>app shell</div>
      </HeygenGuard>,
    );
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /heygen integration required/i }),
      ).toBeInTheDocument(),
    );
  });

  it("renders the gate when no DM token is in localStorage", async () => {
    render(
      <HeygenGuard>
        <div>app shell</div>
      </HeygenGuard>,
    );
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /heygen integration required/i }),
      ).toBeInTheDocument(),
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("renders the gate when no tenant resolves", async () => {
    localStorage.setItem("dm_token", "tok");
    mockedTenant = "";
    render(
      <HeygenGuard>
        <div>app shell</div>
      </HeygenGuard>,
    );
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /heygen integration required/i }),
      ).toBeInTheDocument(),
    );
  });

  it("treats a network failure as missing-credential", async () => {
    localStorage.setItem("dm_token", "tok");
    fetchSpy.mockRejectedValueOnce(new Error("network down"));
    render(
      <HeygenGuard>
        <div>app shell</div>
      </HeygenGuard>,
    );
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /heygen integration required/i }),
      ).toBeInTheDocument(),
    );
  });

  it("treats a non-array response as missing", async () => {
    localStorage.setItem("dm_token", "tok");
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "unexpected" }), { status: 200 }),
    );
    render(
      <HeygenGuard>
        <div>app shell</div>
      </HeygenGuard>,
    );
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /heygen integration required/i }),
      ).toBeInTheDocument(),
    );
  });
});
