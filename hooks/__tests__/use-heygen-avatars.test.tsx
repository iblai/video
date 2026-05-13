import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

const getHeygenAvatarGroupMock = vi.fn();
const listHeygenPrivateAvatarResourcesMock = vi.fn();

vi.mock("@/lib/heygen/rest", () => ({
  getHeygenAvatarGroup: (...args: unknown[]) =>
    getHeygenAvatarGroupMock(...args),
}));
vi.mock("@/lib/iblai/catalog", () => ({
  listHeygenPrivateAvatarResources: (...args: unknown[]) =>
    listHeygenPrivateAvatarResourcesMock(...args),
}));
vi.mock("@/lib/iblai/tenant", () => ({
  resolveAppTenant: () => mockedTenant,
}));

let mockedTenant = "acme";

import { useHeygenAvatars } from "@/hooks/use-heygen-avatars";

describe("useHeygenAvatars", () => {
  beforeEach(() => {
    getHeygenAvatarGroupMock.mockReset();
    listHeygenPrivateAvatarResourcesMock.mockReset();
    mockedTenant = "acme";
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    getHeygenAvatarGroupMock.mockReset();
    listHeygenPrivateAvatarResourcesMock.mockReset();
    vi.restoreAllMocks();
  });

  it("returns an empty list when no tenant resolves", async () => {
    mockedTenant = "";
    listHeygenPrivateAvatarResourcesMock.mockResolvedValue([]);
    const { result } = renderHook(() => useHeygenAvatars());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.avatars).toEqual([]);
    expect(listHeygenPrivateAvatarResourcesMock).not.toHaveBeenCalled();
  });

  it("merges catalog thumbnails into the HeyGen group response", async () => {
    listHeygenPrivateAvatarResourcesMock.mockResolvedValue([
      {
        data: { id: "g1", image_url: "https://catalog/g1.png" },
      },
      {
        data: { id: "g2", image_url: "https://catalog/g2.png" },
      },
    ]);
    getHeygenAvatarGroupMock.mockImplementation(async (id: string) => ({
      id,
      name: id,
      preview_image_url: "https://heygen-original/" + id,
    }));
    const { result } = renderHook(() => useHeygenAvatars());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.avatars).toEqual([
      { id: "g1", name: "g1", preview_image_url: "https://catalog/g1.png" },
      { id: "g2", name: "g2", preview_image_url: "https://catalog/g2.png" },
    ]);
  });

  it("drops avatars whose group fetch fails", async () => {
    listHeygenPrivateAvatarResourcesMock.mockResolvedValue([
      { data: { id: "g1" } },
      { data: { id: "g2" } },
    ]);
    getHeygenAvatarGroupMock.mockImplementation(async (id: string) => {
      if (id === "g2") throw new Error("boom");
      return { id, name: id };
    });
    const { result } = renderHook(() => useHeygenAvatars());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.avatars).toEqual([{ id: "g1", name: "g1" }]);
  });

  it("surfaces an error when the catalog listing throws", async () => {
    listHeygenPrivateAvatarResourcesMock.mockRejectedValueOnce(
      new Error("catalog down"),
    );
    const { result } = renderHook(() => useHeygenAvatars());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("catalog down");
  });

  it("honours the platform override prop", async () => {
    listHeygenPrivateAvatarResourcesMock.mockResolvedValue([]);
    renderHook(() => useHeygenAvatars({ platform: "other" }));
    await waitFor(() =>
      expect(listHeygenPrivateAvatarResourcesMock).toHaveBeenCalledWith(
        "other",
      ),
    );
  });

  it("refetchGroup updates a single avatar in place", async () => {
    listHeygenPrivateAvatarResourcesMock.mockResolvedValue([
      { data: { id: "g1", image_url: "https://catalog/g1.png" } },
    ]);
    getHeygenAvatarGroupMock.mockResolvedValueOnce({
      id: "g1",
      name: "g1",
    });
    const { result } = renderHook(() => useHeygenAvatars());
    await waitFor(() => expect(result.current.avatars).toHaveLength(1));

    getHeygenAvatarGroupMock.mockResolvedValueOnce({
      id: "g1",
      name: "renamed",
    });
    await act(async () => {
      await result.current.refetchGroup("g1");
    });
    expect(result.current.avatars[0].name).toBe("renamed");
    expect(result.current.avatars[0].preview_image_url).toBe(
      "https://catalog/g1.png",
    );
  });

  it("refetchGroup tolerates a failing fetch without throwing", async () => {
    listHeygenPrivateAvatarResourcesMock.mockResolvedValue([]);
    const { result } = renderHook(() => useHeygenAvatars());
    await waitFor(() => expect(result.current.loading).toBe(false));
    getHeygenAvatarGroupMock.mockRejectedValueOnce(new Error("boom"));
    await act(async () => {
      await result.current.refetchGroup("g1");
    });
    expect(result.current.error).toBeNull();
  });
});
