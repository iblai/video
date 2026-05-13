import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from "vitest";

vi.mock("@/lib/iblai/config", () => ({
  default: { dmUrl: () => "https://dm.test" },
}));

import {
  createVideoPromptResource,
  createHeygenPrivateVoiceResource,
  deleteCatalogResource,
  getCurrentUsername,
  listCatalogResources,
  listHeygenPrivateAvatarResources,
} from "@/lib/iblai/catalog";

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

describe("catalog", () => {
  let fetchSpy: MockInstance<typeof fetch>;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("dm_token", "fake-dm-token");
    localStorage.setItem(
      "userData",
      JSON.stringify({ user_nicename: "alice", username: "alice@x" }),
    );
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });
  afterEach(() => {
    fetchSpy.mockRestore();
    localStorage.clear();
  });

  describe("getCurrentUsername", () => {
    it("returns user_nicename when present", () => {
      expect(getCurrentUsername()).toBe("alice");
    });

    it("falls back to username when nicename missing", () => {
      localStorage.setItem("userData", JSON.stringify({ username: "bob" }));
      expect(getCurrentUsername()).toBe("bob");
    });

    it("returns empty string when userData is absent", () => {
      localStorage.removeItem("userData");
      expect(getCurrentUsername()).toBe("");
    });

    it("returns empty string when userData is unparseable JSON", () => {
      localStorage.setItem("userData", "{not-json");
      expect(getCurrentUsername()).toBe("");
    });
  });

  describe("listCatalogResources", () => {
    it("throws when platform is missing", async () => {
      await expect(
        listCatalogResources({ platform: "" }),
      ).rejects.toThrow(/platform is required/);
    });

    it("calls the dm endpoint with platform + filters and returns results array", async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse({ results: [{ id: 1 }] }));

      const out = await listCatalogResources({
        platform: "acme",
        username: "alice",
        resource_type: "video_prompt",
      });

      expect(out).toEqual([{ id: 1 }]);
      const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
      const parsed = new URL(url);
      expect(parsed.origin + parsed.pathname).toBe(
        "https://dm.test/api/catalog/resources/",
      );
      expect(parsed.searchParams.get("platform_key")).toBe("acme");
      expect(parsed.searchParams.get("username")).toBe("alice");
      expect(parsed.searchParams.get("resource_type")).toBe("video_prompt");
      expect((init.headers as Record<string, string>).Authorization).toBe(
        "Token fake-dm-token",
      );
    });

    it("handles a bare array response shape", async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse([{ id: 7 }]));
      const out = await listCatalogResources({ platform: "acme" });
      expect(out).toEqual([{ id: 7 }]);
    });

    it("throws when the endpoint returns a non-ok status", async () => {
      fetchSpy.mockResolvedValueOnce(
        jsonResponse(
          { detail: "nope" },
          { status: 500, statusText: "Server Error" },
        ),
      );
      await expect(
        listCatalogResources({ platform: "acme" }),
      ).rejects.toThrow(/500 Server Error/);
    });
  });

  describe("listHeygenPrivateAvatarResources", () => {
    it("returns [] without hitting the network when platform is empty", async () => {
      const out = await listHeygenPrivateAvatarResources("");
      expect(out).toEqual([]);
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe("createVideoPromptResource", () => {
    it("sends the JSON body with credentials in body and a body-mode platform_key", async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse({ id: 9 }));
      const out = await createVideoPromptResource("acme", {
        title: "T",
        category: "C",
        description: "D",
      });
      expect(out).toEqual({ id: 9 });

      const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
      const parsed = new URL(url);
      // credentialsIn === "body" → query string stays empty
      expect(parsed.search).toBe("");
      const body = JSON.parse(init.body as string);
      expect(body).toMatchObject({
        resource_type: "video_prompt",
        platform_key: "acme",
        username: "alice",
        data: { title: "T", category: "C", description: "D" },
        name: "T",
        description: "D",
      });
    });
  });

  describe("createHeygenPrivateVoiceResource", () => {
    it("includes optional metadata only when provided", async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse({ id: 1 }));
      await createHeygenPrivateVoiceResource("acme", "voice-99", {
        name: "Voice",
        language: "en",
      });
      const body = JSON.parse(
        (fetchSpy.mock.calls[0][1] as RequestInit).body as string,
      );
      expect(body.resource_type).toBe("heygen_private_voice");
      expect(body.data).toEqual({ id: "voice-99", language: "en" });
      expect(body.data).not.toHaveProperty("gender");
      expect(body.data).not.toHaveProperty("preview_audio_url");
    });
  });

  describe("deleteCatalogResource", () => {
    it("sends DELETE with id + resource_type + platform_key in the query string", async () => {
      fetchSpy.mockResolvedValueOnce(
        new Response(null, { status: 204 }),
      );
      await deleteCatalogResource(42, {
        platform: "acme",
        resource_type: "video_prompt",
      });
      const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(init.method).toBe("DELETE");
      expect(init.body).toBeUndefined();
      const parsed = new URL(url);
      expect(parsed.searchParams.get("id")).toBe("42");
      expect(parsed.searchParams.get("resource_type")).toBe("video_prompt");
      expect(parsed.searchParams.get("platform_key")).toBe("acme");
      expect(parsed.searchParams.get("username")).toBe("alice");
    });

    it("throws when DELETE returns a non-2xx response", async () => {
      fetchSpy.mockResolvedValueOnce(
        new Response(null, { status: 500, statusText: "Boom" }),
      );
      await expect(
        deleteCatalogResource(1, { platform: "x", resource_type: "video_prompt" }),
      ).rejects.toThrow(/delete failed: 500/);
    });

    it("validates required options", async () => {
      await expect(
        deleteCatalogResource(1, { platform: "", resource_type: "video_prompt" }),
      ).rejects.toThrow(/platform is required/);
      await expect(
        deleteCatalogResource(1, { platform: "x", resource_type: "" }),
      ).rejects.toThrow(/resource_type is required/);
    });
  });
});
