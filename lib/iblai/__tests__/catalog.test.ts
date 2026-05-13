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
  createCatalogResource,
  createHeygenPrivateAvatarResource,
  createHeygenPrivateVideoResource,
  createHeygenPrivateVoiceResource,
  createVideoPromptResource,
  deleteCatalogResource,
  getCurrentUsername,
  listCatalogResources,
  listHeygenPrivateAvatarResources,
  listHeygenPrivateVideoResources,
  listHeygenPrivateVoiceResources,
  listVideoPromptResources,
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

    it("scopes to the heygen_private_avatar resource_type and omits username", async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse([]));
      await listHeygenPrivateAvatarResources("acme");
      const [url] = fetchSpy.mock.calls[0] as [string, RequestInit];
      const parsed = new URL(url);
      expect(parsed.searchParams.get("resource_type")).toBe(
        "heygen_private_avatar",
      );
      expect(parsed.searchParams.get("username")).toBeNull();
    });
  });

  describe("other list wrappers", () => {
    it.each([
      ["listHeygenPrivateVideoResources", listHeygenPrivateVideoResources, "heygen_private_video"],
      ["listHeygenPrivateVoiceResources", listHeygenPrivateVoiceResources, "heygen_private_voice"],
      ["listVideoPromptResources", listVideoPromptResources, "video_prompt"],
    ])("%s scopes to %s without sending username", async (_name, fn, type) => {
      fetchSpy.mockResolvedValueOnce(jsonResponse([]));
      await fn("acme");
      const [url] = fetchSpy.mock.calls[0] as [string, RequestInit];
      const parsed = new URL(url);
      expect(parsed.searchParams.get("resource_type")).toBe(type);
      expect(parsed.searchParams.get("username")).toBeNull();
    });

    it.each([
      ["listHeygenPrivateVideoResources", listHeygenPrivateVideoResources],
      ["listHeygenPrivateVoiceResources", listHeygenPrivateVoiceResources],
      ["listVideoPromptResources", listVideoPromptResources],
    ])("%s short-circuits when platform is empty", async (_name, fn) => {
      await expect(fn("")).resolves.toEqual([]);
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe("createCatalogResource", () => {
    it("validates that platform is required", async () => {
      await expect(
        createCatalogResource({
          platform: "",
          resource_type: "video_prompt",
          data: {},
        }),
      ).rejects.toThrow(/platform is required/);
    });

    it("validates that resource_type is required", async () => {
      await expect(
        createCatalogResource({
          platform: "acme",
          resource_type: "",
          data: {},
        }),
      ).rejects.toThrow(/resource_type is required/);
    });

    it("defaults credentialsIn to query and includes optional fields when set", async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse({ id: 1 }));
      await createCatalogResource({
        platform: "acme",
        resource_type: "video_prompt",
        data: { title: "t" },
        name: "n",
        description: "d",
        image: "i",
        url: "u",
      });
      const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
      const parsed = new URL(url);
      // query-mode credentials
      expect(parsed.searchParams.get("platform_key")).toBe("acme");
      expect(parsed.searchParams.get("username")).toBe("alice");
      const body = JSON.parse(init.body as string);
      expect(body).toMatchObject({
        resource_type: "video_prompt",
        data: { title: "t" },
        name: "n",
        description: "d",
        image: "i",
        url: "u",
      });
      expect(body).not.toHaveProperty("platform_key");
      expect(body).not.toHaveProperty("username");
    });

    it("throws when the upstream returns non-ok", async () => {
      fetchSpy.mockResolvedValueOnce(
        jsonResponse(
          { detail: "nope" },
          { status: 500, statusText: "Server Error" },
        ),
      );
      await expect(
        createCatalogResource({
          platform: "acme",
          resource_type: "video_prompt",
          data: {},
        }),
      ).rejects.toThrow(/create failed: 500/);
    });
  });

  describe("createHeygenPrivate{Avatar,Video,Voice}Resource", () => {
    it("creates a heygen_private_avatar with optional image_url", async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse({ id: 1 }));
      await createHeygenPrivateAvatarResource("acme", "g1", {
        name: "n",
        image_url: "https://x/p.png",
      });
      const body = JSON.parse(
        (fetchSpy.mock.calls[0][1] as RequestInit).body as string,
      );
      expect(body.resource_type).toBe("heygen_private_avatar");
      expect(body.data).toEqual({ id: "g1", image_url: "https://x/p.png" });
    });

    it("omits image_url when not provided", async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse({ id: 1 }));
      await createHeygenPrivateAvatarResource("acme", "g1");
      const body = JSON.parse(
        (fetchSpy.mock.calls[0][1] as RequestInit).body as string,
      );
      expect(body.data).toEqual({ id: "g1" });
    });

    it("creates a heygen_private_video with optional image_url", async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse({ id: 1 }));
      await createHeygenPrivateVideoResource("acme", "v1", {
        image_url: "https://x/t.png",
      });
      const body = JSON.parse(
        (fetchSpy.mock.calls[0][1] as RequestInit).body as string,
      );
      expect(body.resource_type).toBe("heygen_private_video");
      expect(body.data).toEqual({ id: "v1", image_url: "https://x/t.png" });
    });

    it("creates a heygen_private_voice with all optional metadata", async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse({ id: 1 }));
      await createHeygenPrivateVoiceResource("acme", "voice-9", {
        name: "Voice",
        language: "en",
        gender: "female",
        preview_audio_url: "https://x/a.mp3",
      });
      const body = JSON.parse(
        (fetchSpy.mock.calls[0][1] as RequestInit).body as string,
      );
      expect(body.data).toEqual({
        id: "voice-9",
        language: "en",
        gender: "female",
        preview_audio_url: "https://x/a.mp3",
      });
    });
  });

  describe("createVideoPromptResource", () => {
    it("throws when no username can be resolved", async () => {
      localStorage.removeItem("userData");
      await expect(
        createVideoPromptResource("acme", {
          title: "T",
          category: "C",
          description: "D",
        }),
      ).rejects.toThrow(/username is required/);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

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

    it("accepts a 204 No Content response without throwing", async () => {
      fetchSpy.mockResolvedValueOnce(
        new Response(null, { status: 204 }),
      );
      await expect(
        deleteCatalogResource(1, {
          platform: "x",
          resource_type: "video_prompt",
        }),
      ).resolves.toBeUndefined();
    });

    it("omits username when no user is logged in", async () => {
      localStorage.removeItem("userData");
      fetchSpy.mockResolvedValueOnce(new Response(null, { status: 204 }));
      await deleteCatalogResource(1, {
        platform: "x",
        resource_type: "video_prompt",
      });
      const [url] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(new URL(url).searchParams.get("username")).toBeNull();
    });
  });

  describe("authHeaders", () => {
    it("throws when no DM token is in localStorage", async () => {
      localStorage.removeItem("dm_token");
      await expect(
        listCatalogResources({ platform: "x" }),
      ).rejects.toThrow(/missing DM token/);
    });
  });
});
