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

  describe("additional REST helpers", () => {
    it("getHeygenAvatarGroup unwraps the data envelope", async () => {
      const { getHeygenAvatarGroup } = await import("@/lib/heygen/rest");
      fetchSpy.mockResolvedValueOnce(
        jsonResponse({ data: { id: "g1", name: "A" } }),
      );
      const result = await getHeygenAvatarGroup("g1");
      expect(result.id).toBe("g1");
      const [url] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(new URL(url).pathname).toBe("/api/heygen/v3/avatars/g1");
    });

    it("uploadHeygenAsset posts the binary body to /v1/asset", async () => {
      const { uploadHeygenAsset } = await import("@/lib/heygen/rest");
      fetchSpy.mockResolvedValueOnce(
        jsonResponse({
          data: { id: "a", image_key: "k", file_type: "image/png", url: "https://x/y" },
        }),
      );
      const blob = new Blob(["raw"], { type: "image/png" });
      const out = await uploadHeygenAsset(blob);
      expect(out.url).toBe("https://x/y");
      const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("/api/heygen/v1/asset");
      expect((init.headers as Record<string, string>)["Content-Type"]).toBe(
        "image/png",
      );
    });

    it("uploadHeygenAsset throws on non-ok upstream", async () => {
      const { uploadHeygenAsset } = await import("@/lib/heygen/rest");
      fetchSpy.mockResolvedValueOnce(
        new Response("nope", { status: 500, statusText: "Err" }),
      );
      const blob = new Blob(["raw"], { type: "image/png" });
      await expect(uploadHeygenAsset(blob)).rejects.toThrow(/v1\/asset: 500/);
    });

    it("ensureUnsignedImageUrl is a no-op for unsigned URLs", async () => {
      const { ensureUnsignedImageUrl } = await import("@/lib/heygen/rest");
      const out = await ensureUnsignedImageUrl(
        "https://resource2.heygen.ai/image/abc.png",
      );
      expect(out).toBe("https://resource2.heygen.ai/image/abc.png");
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("ensureUnsignedImageUrl is a no-op for empty input", async () => {
      const { ensureUnsignedImageUrl } = await import("@/lib/heygen/rest");
      expect(await ensureUnsignedImageUrl("")).toBe("");
    });

    it("ensureUnsignedImageUrl rehosts signed URLs via /v1/asset", async () => {
      const { ensureUnsignedImageUrl } = await import("@/lib/heygen/rest");
      const signed =
        "https://files2.heygen.ai/x.png?Signature=abc&Expires=1";
      fetchSpy
        .mockResolvedValueOnce(
          new Response("imgbytes", {
            status: 200,
            headers: { "content-type": "image/png" },
          }),
        )
        .mockResolvedValueOnce(
          jsonResponse({
            data: {
              id: "a",
              image_key: "k",
              file_type: "image/png",
              url: "https://resource2.heygen.ai/image/new.png",
            },
          }),
        );
      const out = await ensureUnsignedImageUrl(signed);
      expect(out).toBe("https://resource2.heygen.ai/image/new.png");
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it("ensureUnsignedImageUrl throws when the fetch step fails", async () => {
      const { ensureUnsignedImageUrl } = await import("@/lib/heygen/rest");
      fetchSpy.mockResolvedValueOnce(
        new Response("nope", { status: 404, statusText: "Not Found" }),
      );
      await expect(
        ensureUnsignedImageUrl(
          "https://files2.heygen.ai/x.png?Signature=abc",
        ),
      ).rejects.toThrow(/heygen re-host/);
    });

    it("createHeygenPhotoAvatarGroup POSTs to v2 endpoint", async () => {
      const { createHeygenPhotoAvatarGroup } = await import("@/lib/heygen/rest");
      fetchSpy.mockResolvedValueOnce(
        jsonResponse({ data: { group_id: "g" } }),
      );
      const out = await createHeygenPhotoAvatarGroup({
        name: "n",
        image_key: "k",
      });
      expect(out.group_id).toBe("g");
      const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(new URL(url).pathname).toBe(
        "/api/heygen/v2/photo_avatar/avatar_group/create",
      );
      expect(JSON.parse(init.body as string)).toEqual({
        name: "n",
        image_key: "k",
      });
    });

    it("getHeygenPhotoAvatarLook GETs the look endpoint", async () => {
      const { getHeygenPhotoAvatarLook } = await import("@/lib/heygen/rest");
      fetchSpy.mockResolvedValueOnce(
        jsonResponse({ data: { id: "l", status: "completed" } }),
      );
      const out = await getHeygenPhotoAvatarLook("g1");
      expect(out.status).toBe("completed");
    });

    it("trainHeygenPhotoAvatarGroup unwraps the nested data.data envelope", async () => {
      const { trainHeygenPhotoAvatarGroup } = await import("@/lib/heygen/rest");
      fetchSpy.mockResolvedValueOnce(
        jsonResponse({ data: { data: { flow_id: "f" } } }),
      );
      const out = await trainHeygenPhotoAvatarGroup("g1");
      expect(out.flow_id).toBe("f");
    });

    it("trainHeygenPhotoAvatarGroup falls back to empty object when envelope is missing", async () => {
      const { trainHeygenPhotoAvatarGroup } = await import("@/lib/heygen/rest");
      fetchSpy.mockResolvedValueOnce(jsonResponse({}));
      const out = await trainHeygenPhotoAvatarGroup("g1");
      expect(out).toEqual({});
    });

    it("finalizeAndTrainPhotoAvatarGroup polls until completed then trains", async () => {
      const { finalizeAndTrainPhotoAvatarGroup } = await import(
        "@/lib/heygen/rest"
      );
      fetchSpy
        .mockResolvedValueOnce(
          jsonResponse({ data: { id: "g", status: "processing" } }),
        )
        .mockResolvedValueOnce(
          jsonResponse({ data: { id: "g", status: "completed" } }),
        )
        .mockResolvedValueOnce(
          jsonResponse({ data: { data: { flow_id: "f" } } }),
        );
      const out = await finalizeAndTrainPhotoAvatarGroup("g", {
        intervalMs: 1,
        timeoutMs: 5_000,
      });
      expect(out.flow_id).toBe("f");
    });

    it("finalizeAndTrainPhotoAvatarGroup throws on a failed look", async () => {
      const { finalizeAndTrainPhotoAvatarGroup } = await import(
        "@/lib/heygen/rest"
      );
      fetchSpy.mockResolvedValueOnce(
        jsonResponse({ data: { id: "g", status: "failed" } }),
      );
      await expect(
        finalizeAndTrainPhotoAvatarGroup("g", {
          intervalMs: 1,
          timeoutMs: 5_000,
        }),
      ).rejects.toThrow(/HeyGen photo processing failed/);
    });

    it("finalizeAndTrainPhotoAvatarGroup throws on timeout", async () => {
      const { finalizeAndTrainPhotoAvatarGroup } = await import(
        "@/lib/heygen/rest"
      );
      // Each fetch needs a fresh Response (bodies are one-shot).
      fetchSpy.mockImplementation(async () =>
        jsonResponse({ data: { id: "g", status: "processing" } }),
      );
      await expect(
        finalizeAndTrainPhotoAvatarGroup("g", {
          intervalMs: 1,
          timeoutMs: 5,
        }),
      ).rejects.toThrow(/timed out/);
    });

    it("getHeygenPhotoAvatarTrainStatus GETs the status endpoint", async () => {
      const { getHeygenPhotoAvatarTrainStatus } = await import(
        "@/lib/heygen/rest"
      );
      fetchSpy.mockResolvedValueOnce(
        jsonResponse({ data: { status: "ready" } }),
      );
      const out = await getHeygenPhotoAvatarTrainStatus("g1");
      expect(out.status).toBe("ready");
    });

    it("createHeygenDigitalTwinAvatar wraps the file as asset_id", async () => {
      const { createHeygenDigitalTwinAvatar } = await import(
        "@/lib/heygen/rest"
      );
      fetchSpy.mockResolvedValueOnce(
        jsonResponse({
          data: {
            avatar_group: { id: "g" },
            avatar_item: { id: "i", status: "processing" },
          },
        }),
      );
      const out = await createHeygenDigitalTwinAvatar({
        name: "n",
        asset_id: "a",
      });
      expect(out.avatar_group.id).toBe("g");
      const body = JSON.parse(
        (fetchSpy.mock.calls[0][1] as RequestInit).body as string,
      );
      expect(body.type).toBe("digital_twin");
      expect(body.file).toEqual({ type: "asset_id", asset_id: "a" });
    });

    it("listHeygenAvatarLooks normalises the response data", async () => {
      const { listHeygenAvatarLooks } = await import("@/lib/heygen/rest");
      fetchSpy.mockResolvedValueOnce(jsonResponse({}));
      const out = await listHeygenAvatarLooks({ groupId: "g" });
      expect(out.data).toEqual([]);
    });

    it("resolveHeygenLookId returns the first completed look id", async () => {
      const { resolveHeygenLookId } = await import("@/lib/heygen/rest");
      fetchSpy.mockResolvedValueOnce(
        jsonResponse({
          data: [
            { id: "l1", status: "processing" },
            { id: "l2", status: "completed" },
          ],
        }),
      );
      expect(await resolveHeygenLookId("g")).toBe("l2");
    });

    it("resolveHeygenLookId surfaces an error when nothing is ready", async () => {
      const { resolveHeygenLookId } = await import("@/lib/heygen/rest");
      fetchSpy.mockResolvedValueOnce(
        jsonResponse({
          data: [
            { id: "l1", status: "failed", error: { message: "bad" } },
          ],
        }),
      );
      await expect(resolveHeygenLookId("g")).rejects.toThrow(/not ready/);
    });

    it("resolveHeygenLookId throws when no looks exist", async () => {
      const { resolveHeygenLookId } = await import("@/lib/heygen/rest");
      fetchSpy.mockResolvedValueOnce(jsonResponse({ data: [] }));
      await expect(resolveHeygenLookId("g")).rejects.toThrow(/no looks/);
    });

    it("getHeygenAvatarLook GETs the look detail endpoint", async () => {
      const { getHeygenAvatarLook } = await import("@/lib/heygen/rest");
      fetchSpy.mockResolvedValueOnce(
        jsonResponse({ data: { id: "l", status: "completed" } }),
      );
      const out = await getHeygenAvatarLook("l");
      expect(out.id).toBe("l");
    });

    it("createHeygenAvatarConsentUrl POSTs to the consent endpoint", async () => {
      const { createHeygenAvatarConsentUrl } = await import("@/lib/heygen/rest");
      fetchSpy.mockResolvedValueOnce(
        jsonResponse({ data: { consent_url: "https://c/x" } }),
      );
      const out = await createHeygenAvatarConsentUrl("g1");
      expect(out.consent_url).toBe("https://c/x");
    });

    it("createHeygenVideo computes 16:9 dimensions by default", async () => {
      const { createHeygenVideo } = await import("@/lib/heygen/rest");
      fetchSpy.mockResolvedValueOnce(
        jsonResponse({ data: { video_id: "vid" } }),
      );
      await createHeygenVideo({
        avatar_id: "a",
        voice_id: "v",
        script: "hi",
      });
      const body = JSON.parse(
        (fetchSpy.mock.calls[0][1] as RequestInit).body as string,
      );
      expect(body.dimension).toEqual({ width: 1280, height: 720 });
    });

    it("createHeygenVideo honours 9:16 aspect ratio", async () => {
      const { createHeygenVideo } = await import("@/lib/heygen/rest");
      fetchSpy.mockResolvedValueOnce(
        jsonResponse({ data: { video_id: "vid" } }),
      );
      await createHeygenVideo({
        avatar_id: "a",
        voice_id: "v",
        script: "hi",
        aspect_ratio: "9:16",
        title: "t",
      });
      const body = JSON.parse(
        (fetchSpy.mock.calls[0][1] as RequestInit).body as string,
      );
      expect(body.dimension).toEqual({ width: 720, height: 1280 });
      expect(body.title).toBe("t");
    });

    it("createHeygenVideoClip supports image_url mode", async () => {
      const { createHeygenVideoClip } = await import("@/lib/heygen/rest");
      fetchSpy.mockResolvedValueOnce(
        jsonResponse({ data: { video_id: "vid" } }),
      );
      await createHeygenVideoClip({
        image_url: "https://x/y.png",
        script: "hi",
        voice_id: "v",
      });
      const body = JSON.parse(
        (fetchSpy.mock.calls[0][1] as RequestInit).body as string,
      );
      expect(body.image).toEqual({ type: "url", url: "https://x/y.png" });
    });

    it("cloneHeygenVoice packages audio_url when given", async () => {
      const { cloneHeygenVoice } = await import("@/lib/heygen/rest");
      fetchSpy.mockResolvedValueOnce(
        jsonResponse({ data: { voice_clone_id: "v" } }),
      );
      const out = await cloneHeygenVoice({
        voice_name: "n",
        audio_url: "https://x/y.mp3",
      });
      expect(out.voice_clone_id).toBe("v");
      const body = JSON.parse(
        (fetchSpy.mock.calls[0][1] as RequestInit).body as string,
      );
      expect(body.audio).toEqual({ type: "url", url: "https://x/y.mp3" });
    });

    it("streaming session helpers hit their endpoints", async () => {
      const {
        createHeygenStreamingSession,
        startHeygenStreamingSession,
        stopHeygenStreamingSession,
        sendHeygenStreamingTask,
        interruptHeygenStreamingSession,
        keepAliveHeygenStreamingSession,
        startHeygenStreamingListening,
        stopHeygenStreamingListening,
      } = await import("@/lib/heygen/rest");

      fetchSpy.mockResolvedValueOnce(
        jsonResponse({
          data: {
            session_id: "s",
            access_token: "t",
            url: "wss://room",
          },
        }),
      );
      const sess = await createHeygenStreamingSession({
        avatar_name: "a",
        quality: "high",
        voice: { voice_id: "v" },
      });
      expect(sess.session_id).toBe("s");
      const body = JSON.parse(
        (fetchSpy.mock.calls[0][1] as RequestInit).body as string,
      );
      expect(body.quality).toBe("high");
      expect(body.version).toBe("v2");

      for (const [fn, path] of [
        [startHeygenStreamingSession, "/api/heygen/v1/streaming.start"],
        [stopHeygenStreamingSession, "/api/heygen/v1/streaming.stop"],
        [interruptHeygenStreamingSession, "/api/heygen/v1/streaming.interrupt"],
        [keepAliveHeygenStreamingSession, "/api/heygen/v1/streaming.keep_alive"],
        [startHeygenStreamingListening, "/api/heygen/v1/streaming.start_listening"],
        [stopHeygenStreamingListening, "/api/heygen/v1/streaming.stop_listening"],
      ] as const) {
        fetchSpy.mockResolvedValueOnce(jsonResponse({}));
        await fn("s");
        const [url] = fetchSpy.mock.calls.at(-1) as [string, RequestInit];
        expect(new URL(url).pathname).toBe(path);
      }

      fetchSpy.mockResolvedValueOnce(jsonResponse({}));
      await sendHeygenStreamingTask({ session_id: "s", text: "hi" });
      const taskBody = JSON.parse(
        (fetchSpy.mock.calls.at(-1)![1] as RequestInit).body as string,
      );
      expect(taskBody.task_type).toBe("talk");
      expect(taskBody.task_mode).toBe("async");
    });

    it("listHeygenKnowledgeBases unwraps data.list", async () => {
      const { listHeygenKnowledgeBases } = await import("@/lib/heygen/rest");
      fetchSpy.mockResolvedValueOnce(
        jsonResponse({ data: { list: [{ id: "k", name: "K" }] } }),
      );
      const out = await listHeygenKnowledgeBases();
      expect(out).toHaveLength(1);
    });

    it("listHeygenKnowledgeBases defaults to empty list when data is missing", async () => {
      const { listHeygenKnowledgeBases } = await import("@/lib/heygen/rest");
      fetchSpy.mockResolvedValueOnce(jsonResponse({}));
      expect(await listHeygenKnowledgeBases()).toEqual([]);
    });

    it("listHeygenInteractiveAvatars unwraps data", async () => {
      const { listHeygenInteractiveAvatars } = await import("@/lib/heygen/rest");
      fetchSpy.mockResolvedValueOnce(
        jsonResponse({ data: [{ avatar_id: "a" }] }),
      );
      expect(await listHeygenInteractiveAvatars()).toHaveLength(1);
    });

    it("listHeygenInteractiveAvatars defaults to empty list", async () => {
      const { listHeygenInteractiveAvatars } = await import("@/lib/heygen/rest");
      fetchSpy.mockResolvedValueOnce(jsonResponse({}));
      expect(await listHeygenInteractiveAvatars()).toEqual([]);
    });

    it("getHeygenVideoStatus unwraps the data envelope", async () => {
      const { getHeygenVideoStatus } = await import("@/lib/heygen/rest");
      fetchSpy.mockResolvedValueOnce(
        jsonResponse({ data: { id: "v", status: "completed" } }),
      );
      const out = await getHeygenVideoStatus("v");
      expect(out.id).toBe("v");
    });

    it("generateHeygenSpeech forwards optional params", async () => {
      const { generateHeygenSpeech } = await import("@/lib/heygen/rest");
      fetchSpy.mockResolvedValueOnce(
        jsonResponse({ data: { audio_url: "https://x/y.mp3" } }),
      );
      await generateHeygenSpeech({
        text: "x",
        voice_id: "v",
        input_type: "ssml",
        language: "en",
        locale: "en-US",
      });
      const body = JSON.parse(
        (fetchSpy.mock.calls[0][1] as RequestInit).body as string,
      );
      expect(body.input_type).toBe("ssml");
      expect(body.language).toBe("en");
      expect(body.locale).toBe("en-US");
    });

    it("throws when no DM token is in localStorage", async () => {
      const { listHeygenVoicesPage } = await import("@/lib/heygen/rest");
      localStorage.removeItem("dm_token");
      await expect(listHeygenVoicesPage({})).rejects.toThrow(
        /missing DM token/,
      );
    });
  });
});
