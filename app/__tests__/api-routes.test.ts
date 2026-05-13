import { describe, expect, it, vi } from "vitest";

const heygenFetchMock = vi.fn();

vi.mock("@/lib/iblai/config", () => ({
  default: {
    dmUrl: () => "https://dm.test",
    mainTenantKey: () => "",
  },
}));

interface FakeRequestInit {
  method: string;
  headers: Record<string, string>;
  url: string;
  body?: string;
}

function makeRequest({
  method,
  url,
  headers = {},
  body,
}: FakeRequestInit): import("next/server").NextRequest {
  const lower: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) lower[k.toLowerCase()] = v;
  const headerObj = {
    get: (key: string) => lower[key.toLowerCase()] ?? null,
  };
  const buffer = body ? new TextEncoder().encode(body).buffer : new ArrayBuffer(0);
  return {
    method,
    url,
    headers: headerObj as unknown as Headers,
    arrayBuffer: async () => buffer,
  } as unknown as import("next/server").NextRequest;
}

describe("openai proxy route", () => {
  it("rejects requests without an Authorization Token", async () => {
    const mod = await import("@/app/api/openai/[...path]/route");
    process.env.OPENAI_API_KEY = "";
    const res = await mod.POST(
      makeRequest({
        method: "POST",
        url: "http://test/api/openai/v1/chat/completions",
        headers: {},
        body: "{}",
      }),
      { params: Promise.resolve({ path: ["v1", "chat", "completions"] }) },
    );
    expect(res.status).toBe(401);
  });

  it("returns 500 when OPENAI_API_KEY is not configured", async () => {
    const mod = await import("@/app/api/openai/[...path]/route");
    delete process.env.OPENAI_API_KEY;
    const res = await mod.POST(
      makeRequest({
        method: "POST",
        url: "http://test/api/openai/v1/chat/completions",
        headers: { authorization: "Token dm-token" },
        body: "{}",
      }),
      { params: Promise.resolve({ path: ["v1", "chat", "completions"] }) },
    );
    expect(res.status).toBe(500);
  });

  it("forwards JSON requests to OpenAI when the key is set", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response('{"ok":true}', {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const mod = await import("@/app/api/openai/[...path]/route");
    const res = await mod.POST(
      makeRequest({
        method: "POST",
        url: "http://test/api/openai/v1/chat/completions?stream=false",
        headers: {
          authorization: "Token dm-token",
          "content-type": "application/json",
        },
        body: '{"model":"gpt-4o-mini"}',
      }),
      { params: Promise.resolve({ path: ["v1", "chat", "completions"] }) },
    );
    expect(res.status).toBe(200);
    const [targetUrl, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(targetUrl).toBe(
      "https://api.openai.com/v1/chat/completions?stream=false",
    );
    expect((init.headers as Headers).get("Authorization")).toBe(
      "Bearer sk-test",
    );
    fetchSpy.mockRestore();
  });

  it("supports GET requests (no body forwarding)", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("ok", { status: 200 }),
    );
    const mod = await import("@/app/api/openai/[...path]/route");
    const res = await mod.GET(
      makeRequest({
        method: "GET",
        url: "http://test/api/openai/v1/models",
        headers: { authorization: "Token dm-token" },
      }),
      { params: Promise.resolve({ path: ["v1", "models"] }) },
    );
    expect(res.status).toBe(200);
    fetchSpy.mockRestore();
  });
});

describe("heygen proxy route", () => {
  it("rejects when Authorization is missing", async () => {
    const mod = await import("@/app/api/heygen/[...path]/route");
    const res = await mod.POST(
      makeRequest({
        method: "POST",
        url: "http://test/api/heygen/v3/videos",
        headers: {},
        body: "{}",
      }),
      { params: Promise.resolve({ path: ["v3", "videos"] }) },
    );
    expect(res.status).toBe(401);
  });

  it("rejects when X-Platform header is missing", async () => {
    const mod = await import("@/app/api/heygen/[...path]/route");
    const res = await mod.GET(
      makeRequest({
        method: "GET",
        url: "http://test/api/heygen/v3/videos",
        headers: { authorization: "Token dm-token" },
      }),
      { params: Promise.resolve({ path: ["v3", "videos"] }) },
    );
    expect(res.status).toBe(400);
  });

  it("returns 502 when the credential lookup fails", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("not found", { status: 404, statusText: "Not Found" }),
    );
    const mod = await import("@/app/api/heygen/[...path]/route");
    const res = await mod.GET(
      makeRequest({
        method: "GET",
        url: "http://test/api/heygen/v3/videos",
        headers: {
          authorization: "Token dm-token",
          "x-platform": "acme",
        },
      }),
      { params: Promise.resolve({ path: ["v3", "videos"] }) },
    );
    expect(res.status).toBe(502);
    fetchSpy.mockRestore();
  });

  it("forwards to HeyGen API once the key resolves", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([{ value: { key: "hg-key" } }]),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response('{"data": []}', {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );

    const mod = await import("@/app/api/heygen/[...path]/route");
    const res = await mod.GET(
      makeRequest({
        method: "GET",
        url: "http://test/api/heygen/v3/voices?limit=5",
        headers: {
          authorization: "Token dm-token",
          "x-platform": "fresh-tenant",
        },
      }),
      { params: Promise.resolve({ path: ["v3", "voices"] }) },
    );
    expect(res.status).toBe(200);
    const [, upstreamInit] = fetchSpy.mock.calls[1] as [string, RequestInit];
    expect((upstreamInit.headers as Headers).get("X-Api-Key")).toBe("hg-key");
    fetchSpy.mockRestore();
  });

  it("uses the upload host for v1/asset paths", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([{ value: { key: "hg-key" } }]),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));

    const mod = await import("@/app/api/heygen/[...path]/route");
    await mod.POST(
      makeRequest({
        method: "POST",
        url: "http://test/api/heygen/v1/asset",
        headers: {
          authorization: "Token dm-token-2",
          "x-platform": "upload-tenant",
          "content-type": "application/octet-stream",
        },
        body: "binary",
      }),
      { params: Promise.resolve({ path: ["v1", "asset"] }) },
    );
    const [target] = fetchSpy.mock.calls[1] as [string, RequestInit];
    expect(target.startsWith("https://upload.heygen.com")).toBe(true);
    fetchSpy.mockRestore();
  });
});
