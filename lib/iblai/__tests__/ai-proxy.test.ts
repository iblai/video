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
vi.mock("@/lib/iblai/tenant", () => ({
  resolveAppTenant: () => mockedTenant,
}));

let mockedTenant = "acme";

import {
  callEndpoint,
  discoverService,
  findEndpoint,
  type ProxyEndpoint,
  type ProxyService,
} from "@/lib/iblai/ai-proxy";

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

const sampleService: ProxyService = {
  slug: "openai",
  display_name: "OpenAI",
  base_url: "https://api.openai.com",
  service_type: "rest",
  auth_mode: "bearer",
  is_enabled: true,
  supports_async_jobs: false,
  supports_streaming: false,
  default_timeout_seconds: 30,
  credential_name: "openai",
  endpoints: [
    {
      slug: "chat-completions",
      path_template: "/v1/chat/completions",
      http_method: "POST",
      is_enabled: true,
    },
    {
      slug: "audio-transcriptions",
      path_template: "/v1/audio/transcriptions",
      http_method: "POST",
      is_enabled: false,
    },
  ],
};

describe("ai-proxy", () => {
  let fetchSpy: MockInstance<typeof fetch>;

  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem("dm_token", "fake-dm-token");
    mockedTenant = "acme";
    fetchSpy = vi.spyOn(globalThis, "fetch");
    // Clear the in-module discovery cache so each test starts fresh.
    vi.resetModules();
  });
  afterEach(() => {
    fetchSpy.mockRestore();
    localStorage.clear();
  });

  describe("discoverService", () => {
    it("hits the discovery endpoint and returns the parsed payload", async () => {
      const { discoverService: fn } = await import("@/lib/iblai/ai-proxy");
      fetchSpy.mockResolvedValueOnce(jsonResponse(sampleService));
      const result = await fn("openai");
      expect(result).toEqual(sampleService);
      const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        "https://dm.test/api/ai-proxy/orgs/acme/services/openai/",
      );
      expect((init.headers as Record<string, string>).Authorization).toBe(
        "Token fake-dm-token",
      );
    });

    it("caches successful discovery per tenant+service", async () => {
      const { discoverService: fn } = await import("@/lib/iblai/ai-proxy");
      fetchSpy
        .mockResolvedValueOnce(jsonResponse(sampleService))
        .mockResolvedValueOnce(jsonResponse(sampleService));
      await fn("openai");
      await fn("openai");
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it("evicts the cache when discovery fails", async () => {
      const { discoverService: fn } = await import("@/lib/iblai/ai-proxy");
      fetchSpy
        .mockResolvedValueOnce(jsonResponse({}, { status: 500, statusText: "Err" }))
        .mockResolvedValueOnce(jsonResponse(sampleService));
      await expect(fn("openai")).rejects.toThrow(/discovery failed for openai/);
      const result = await fn("openai");
      expect(result).toEqual(sampleService);
    });

    it("throws when no tenant resolves", async () => {
      mockedTenant = "";
      const { discoverService: fn } = await import("@/lib/iblai/ai-proxy");
      await expect(fn("openai")).rejects.toThrow(/no tenant\/platform resolved/);
    });

    it("throws when no DM token is available", async () => {
      localStorage.removeItem("dm_token");
      const { discoverService: fn } = await import("@/lib/iblai/ai-proxy");
      fetchSpy.mockResolvedValueOnce(jsonResponse(sampleService));
      await expect(fn("openai")).rejects.toThrow(/missing DM token/);
    });
  });

  describe("findEndpoint", () => {
    it("matches by path + method, ignoring disabled endpoints", () => {
      expect(
        findEndpoint(sampleService, "/v1/chat/completions", "POST"),
      ).toBeDefined();
      expect(
        findEndpoint(sampleService, "/v1/audio/transcriptions", "POST"),
      ).toBeUndefined();
      expect(
        findEndpoint(sampleService, "/missing", "POST"),
      ).toBeUndefined();
    });

    it("treats method comparison as case-insensitive", () => {
      expect(
        findEndpoint(sampleService, "/v1/chat/completions", "post"),
      ).toBeDefined();
    });
  });

  describe("callEndpoint", () => {
    const endpoint: ProxyEndpoint = sampleService.endpoints[0];

    it("sends JSON payload when no files are present", async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse({ ok: true }));
      const result = await callEndpoint("openai", endpoint, {
        body: { model: "gpt-4o-mini" },
        query: { stream: false },
        headers: { "X-Trace": "1" },
        path_params: { id: "abc" },
      });
      expect(result).toEqual({ ok: true });
      const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        "https://dm.test/api/ai-proxy/orgs/acme/services/openai/chat-completions/",
      );
      expect(init.method).toBe("POST");
      expect((init.headers as Record<string, string>)["Content-Type"]).toBe(
        "application/json",
      );
      const body = JSON.parse(init.body as string);
      expect(body).toEqual({
        body: { model: "gpt-4o-mini" },
        query: { stream: false },
        headers: { "X-Trace": "1" },
        path_params: { id: "abc" },
      });
    });

    it("switches to multipart/form-data when init.files contains a Blob", async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse({ ok: true }));
      const blob = new Blob(["hello"], { type: "text/plain" });
      const file = new File(["hi"], "hi.txt", { type: "text/plain" });
      await callEndpoint("openai", endpoint, {
        body: { topic: "x" },
        query: { q: 1 },
        headers: { "X-T": "y" },
        path_params: { id: "1" },
        files: { audio: blob, doc: file, label: "raw-string" as unknown },
      });
      const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(init.body).toBeInstanceOf(FormData);
      const form = init.body as FormData;
      expect(form.get("body")).toBe(JSON.stringify({ topic: "x" }));
      expect(form.get("query")).toBe(JSON.stringify({ q: 1 }));
      expect(form.get("headers")).toBe(JSON.stringify({ "X-T": "y" }));
      expect(form.get("path_params")).toBe(JSON.stringify({ id: "1" }));
      expect(form.get("audio")).toBeInstanceOf(Blob);
      expect(form.get("doc")).toBeInstanceOf(File);
      expect(form.get("label")).toBe("raw-string");
      expect((init.headers as Record<string, string>)["Content-Type"]).toBeUndefined();
    });

    it("propagates non-binary `files` entries through the JSON payload", async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse({ ok: true }));
      await callEndpoint("openai", endpoint, {
        files: { link: "https://example.com/x" } as unknown as Record<
          string,
          unknown
        >,
      });
      const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(init.body).toBe(
        JSON.stringify({ files: { link: "https://example.com/x" } }),
      );
    });

    it("throws when the upstream returns non-ok", async () => {
      fetchSpy.mockResolvedValueOnce(
        jsonResponse({}, { status: 500, statusText: "Boom" }),
      );
      await expect(callEndpoint("openai", endpoint)).rejects.toThrow(
        /chat-completions failed: 500 Boom/,
      );
    });

    it("honours an explicit tenant override", async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse({ ok: true }));
      await callEndpoint("openai", endpoint, { tenant: "other-tenant" });
      const [url] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(url).toContain("/orgs/other-tenant/");
    });
  });

  it("re-exports discoverService for direct use", () => {
    expect(typeof discoverService).toBe("function");
  });
});
