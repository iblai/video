import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from "vitest";

vi.mock("@/lib/iblai/tenant", () => ({
  resolveAppTenant: () => "acme",
}));

import {
  cloneHeygenVoice,
  createHeygenVideoClip,
  generateHeygenSpeech,
  isSignedHeygenUrl,
  listHeygenVideosPage,
  listHeygenVoicesPage,
} from "@/lib/heygen/rest";

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

describe("heygen rest client", () => {
  let fetchSpy: MockInstance<typeof fetch>;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("dm_token", "fake-dm-token");
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });
  afterEach(() => {
    fetchSpy.mockRestore();
    localStorage.clear();
  });

  describe("listHeygenVoicesPage", () => {
    it("hits /api/heygen/v3/voices with the auth + platform headers and filters", async () => {
      fetchSpy.mockResolvedValueOnce(
        jsonResponse({
          data: [{ voice_id: "v1", name: "One" }],
          has_more: true,
          next_token: "tok",
        }),
      );
      const page = await listHeygenVoicesPage({
        type: "public",
        engine: "starfish",
        limit: 25,
      });
      expect(page.data).toHaveLength(1);
      expect(page.next_token).toBe("tok");

      const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
      const parsed = new URL(url);
      expect(parsed.pathname).toBe("/api/heygen/v3/voices");
      expect(parsed.searchParams.get("type")).toBe("public");
      expect(parsed.searchParams.get("engine")).toBe("starfish");
      expect(parsed.searchParams.get("limit")).toBe("25");

      const headers = init.headers as Record<string, string>;
      expect(headers.Authorization).toBe("Token fake-dm-token");
      expect(headers["X-Platform"]).toBe("acme");
    });

    it("forwards a custom platform override (e.g. main tenant)", async () => {
      fetchSpy.mockResolvedValueOnce(
        jsonResponse({ data: [], has_more: false, next_token: null }),
      );
      await listHeygenVideosPage({ limit: 5, platform: "main" });

      const headers = (fetchSpy.mock.calls[0][1] as RequestInit)
        .headers as Record<string, string>;
      expect(headers["X-Platform"]).toBe("main");
    });
  });

  describe("createHeygenVideoClip", () => {
    it("requires image_asset_id or image_url", async () => {
      await expect(
        createHeygenVideoClip({ script: "hi", voice_id: "v" }),
      ).rejects.toThrow(/image_asset_id or image_url/);
    });

    it("posts an image-mode payload with script + voice + motion", async () => {
      fetchSpy.mockResolvedValueOnce(
        jsonResponse({ data: { video_id: "vid-1" } }),
      );
      const out = await createHeygenVideoClip({
        image_asset_id: "asset-9",
        script: "Hello",
        voice_id: "voice-1",
        motion_prompt: "wave hello",
        aspect_ratio: "16:9",
        title: "test",
      });
      expect(out.video_id).toBe("vid-1");

      const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(init.method).toBe("POST");
      const body = JSON.parse(init.body as string);
      expect(body.type).toBe("image");
      expect(body.image).toEqual({ type: "asset_id", asset_id: "asset-9" });
      expect(body.script).toBe("Hello");
      expect(body.voice_id).toBe("voice-1");
      expect(body.motion_prompt).toBe("wave hello");
      expect(body.aspect_ratio).toBe("16:9");
    });
  });

  describe("cloneHeygenVoice", () => {
    it("requires an audio source", async () => {
      await expect(
        cloneHeygenVoice({ voice_name: "demo" }),
      ).rejects.toThrow(/audio_asset_id or audio_url/);
    });

    it("packages audio as asset_id when given", async () => {
      fetchSpy.mockResolvedValueOnce(
        jsonResponse({ data: { voice_clone_id: "voice-new" } }),
      );
      const out = await cloneHeygenVoice({
        voice_name: "demo",
        audio_asset_id: "asset-1",
        language: "en",
      });
      expect(out.voice_clone_id).toBe("voice-new");
      const body = JSON.parse(
        (fetchSpy.mock.calls[0][1] as RequestInit).body as string,
      );
      expect(body.audio).toEqual({ type: "asset_id", asset_id: "asset-1" });
      expect(body.language).toBe("en");
    });
  });

  describe("generateHeygenSpeech", () => {
    it("hits /v3/voices/speech with the text + voice + speed", async () => {
      fetchSpy.mockResolvedValueOnce(
        jsonResponse({
          data: { audio_url: "https://files/clip.mp3", duration: 2 },
        }),
      );
      const out = await generateHeygenSpeech({
        text: "Hello",
        voice_id: "voice-1",
        speed: 1.2,
      });
      expect(out.audio_url).toBe("https://files/clip.mp3");
      const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(new URL(url).pathname).toBe("/api/heygen/v3/voices/speech");
      const body = JSON.parse(init.body as string);
      expect(body).toMatchObject({
        text: "Hello",
        voice_id: "voice-1",
        speed: 1.2,
      });
    });
  });

  describe("isSignedHeygenUrl", () => {
    it("flags CloudFront-signed URLs", () => {
      expect(
        isSignedHeygenUrl(
          "https://files2.heygen.ai/x.png?Signature=abc&Expires=1",
        ),
      ).toBe(true);
    });

    it("treats unsigned URLs as safe", () => {
      expect(
        isSignedHeygenUrl("https://resource2.heygen.ai/image/abc.png"),
      ).toBe(false);
    });

    it("returns false for empty input", () => {
      expect(isSignedHeygenUrl("")).toBe(false);
    });
  });

  it("throws a descriptive error for non-2xx upstream", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response("nope", { status: 502, statusText: "Bad Gateway" }),
    );
    await expect(listHeygenVoicesPage({ limit: 1 })).rejects.toThrow(
      /heygen \/v3\/voices: 502/,
    );
  });
});
