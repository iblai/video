import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

vi.mock("@/lib/iblai/tenant", () => ({
  resolveAppTenant: () => "gwu",
}));

import { useIsAdmin } from "@/hooks/use-is-admin";

describe("useIsAdmin", () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    localStorage.clear();
  });

  it("returns false before tenants is in localStorage", () => {
    const { result } = renderHook(() => useIsAdmin());
    expect(result.current).toBe(false);
  });

  it("returns true when the active tenant has is_admin=true", async () => {
    localStorage.setItem(
      "tenants",
      JSON.stringify([
        { key: "main", is_admin: false },
        { key: "gwu", is_admin: true },
      ]),
    );
    const { result } = renderHook(() => useIsAdmin());
    await waitFor(() => expect(result.current).toBe(true));
  });

  it("returns false when the active tenant has is_admin=false", async () => {
    localStorage.setItem(
      "tenants",
      JSON.stringify([{ key: "gwu", is_admin: false }]),
    );
    const { result } = renderHook(() => useIsAdmin());
    await waitFor(() => expect(result.current).toBe(false));
  });

  it("returns false when no tenant entry matches", async () => {
    localStorage.setItem(
      "tenants",
      JSON.stringify([{ key: "other", is_admin: true }]),
    );
    const { result } = renderHook(() => useIsAdmin());
    await waitFor(() => expect(result.current).toBe(false));
  });

  it("tolerates a non-array tenants blob (single object)", async () => {
    localStorage.setItem(
      "tenants",
      JSON.stringify({ key: "gwu", is_admin: true }),
    );
    const { result } = renderHook(() => useIsAdmin());
    await waitFor(() => expect(result.current).toBe(true));
  });

  it("tolerates malformed JSON without throwing", () => {
    localStorage.setItem("tenants", "{not json");
    const { result } = renderHook(() => useIsAdmin());
    expect(result.current).toBe(false);
  });

  it("treats a present-but-empty tenants array as not-yet-loaded", () => {
    localStorage.setItem("tenants", JSON.stringify([]));
    const { result } = renderHook(() => useIsAdmin());
    expect(result.current).toBe(false);
  });

  it("picks up tenants populated after mount via the polling fallback", async () => {
    const { result } = renderHook(() => useIsAdmin());
    expect(result.current).toBe(false);

    localStorage.setItem(
      "tenants",
      JSON.stringify([{ key: "gwu", is_admin: true }]),
    );

    await waitFor(() => expect(result.current).toBe(true), { timeout: 3000 });
  });

  it("re-evaluates when a `storage` event fires for the tenants key", async () => {
    const { result } = renderHook(() => useIsAdmin());
    expect(result.current).toBe(false);

    localStorage.setItem(
      "tenants",
      JSON.stringify([{ key: "gwu", is_admin: true }]),
    );
    // Same-tab writes don't fire `storage`; simulate the cross-tab case.
    window.dispatchEvent(
      new StorageEvent("storage", { key: "tenants", newValue: "" }),
    );

    await waitFor(() => expect(result.current).toBe(true));
  });
});
