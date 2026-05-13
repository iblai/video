import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

const listHeygenVoicesPageMock = vi.fn();
const listHeygenPrivateVoiceResourcesMock = vi.fn();

vi.mock("@/lib/heygen/rest", () => ({
  listHeygenVoicesPage: (...args: unknown[]) =>
    listHeygenVoicesPageMock(...args),
}));
vi.mock("@/lib/iblai/catalog", () => ({
  listHeygenPrivateVoiceResources: (...args: unknown[]) =>
    listHeygenPrivateVoiceResourcesMock(...args),
}));
vi.mock("@/lib/iblai/tenant", () => ({
  resolveAppTenant: () => "acme",
}));

import { useHeygenVoices } from "@/hooks/use-heygen-voices";

describe("useHeygenVoices", () => {
  beforeEach(() => {
    listHeygenVoicesPageMock.mockReset();
    listHeygenPrivateVoiceResourcesMock.mockReset();
  });
  afterEach(() => {
    listHeygenVoicesPageMock.mockReset();
    listHeygenPrivateVoiceResourcesMock.mockReset();
  });

  it("merges catalog voices first, then HeyGen library, and dedupes by id", async () => {
    listHeygenVoicesPageMock.mockResolvedValueOnce({
      data: [
        { voice_id: "v-shared", name: "From HeyGen", type: "private" },
        { voice_id: "v-heygen-only", name: "HeyGen Only", type: "public" },
      ],
      has_more: false,
      next_token: null,
    });
    listHeygenPrivateVoiceResourcesMock.mockResolvedValueOnce([
      {
        item_id: "a",
        id: 1,
        name: "Catalog Voice",
        url: "",
        resource_type: "heygen_private_voice",
        data: { id: "v-shared", language: "en" },
        image: "",
        description: "",
      },
    ]);

    const { result } = renderHook(() =>
      useHeygenVoices({ type: "private", pageSize: 10 }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.voices.map((v) => v.voice_id)).toEqual([
      "v-shared",
      "v-heygen-only",
    ]);
    // catalog-sourced voice keeps its "private" type marker
    expect(result.current.voices[0]).toMatchObject({
      voice_id: "v-shared",
      name: "Catalog Voice",
      type: "private",
    });
    expect(result.current.hasMore).toBe(false);
  });

  it("loadMore appends a deduped page using the current cursor token", async () => {
    listHeygenVoicesPageMock
      .mockResolvedValueOnce({
        data: [{ voice_id: "v-1", name: "One" }],
        has_more: true,
        next_token: "cursor-1",
      })
      .mockResolvedValueOnce({
        // includes a duplicate that must be dropped
        data: [
          { voice_id: "v-1", name: "Dup" },
          { voice_id: "v-2", name: "Two" },
        ],
        has_more: false,
        next_token: null,
      });
    listHeygenPrivateVoiceResourcesMock.mockResolvedValue([]);

    const { result } = renderHook(() =>
      useHeygenVoices({ type: "public", pageSize: 1 }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasMore).toBe(true);

    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.voices.map((v) => v.voice_id)).toEqual(["v-1", "v-2"]);
    expect(result.current.hasMore).toBe(false);

    // second call carried the cursor from the first response
    const secondCallArgs = listHeygenVoicesPageMock.mock.calls[1][0] as {
      token?: string;
    };
    expect(secondCallArgs.token).toBe("cursor-1");
  });

  it("surfaces the error message when the initial load rejects", async () => {
    listHeygenVoicesPageMock.mockRejectedValueOnce(new Error("network down"));
    listHeygenPrivateVoiceResourcesMock.mockResolvedValue([]);

    const { result } = renderHook(() =>
      useHeygenVoices({ type: "public", pageSize: 5 }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("network down");
    expect(result.current.voices).toEqual([]);
  });
});
