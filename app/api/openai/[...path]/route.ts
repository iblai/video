/**
 * OpenAI REST proxy (server).
 *
 * The browser never sees the OpenAI API key:
 *   1. Client calls `/api/openai/<path>` with its ibl.ai DM token in
 *      `Authorization: Token <dm_token>` so only logged-in users can use
 *      the proxy.
 *   2. This handler reads `OPENAI_API_KEY` from the server env and
 *      forwards the request to `https://api.openai.com/<path>` with
 *      `Authorization: Bearer <key>`. The upstream response is streamed
 *      back to the client.
 *
 * Use `OPENAI_API_KEY` (not `NEXT_PUBLIC_OPENAI_API_KEY`) — the latter
 * would be inlined into the browser bundle.
 */
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const OPENAI_API_BASE = "https://api.openai.com";

async function proxy(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const { path } = await ctx.params;

  const auth = req.headers.get("authorization") ?? "";
  const dmToken = auth.replace(/^Token\s+/i, "").trim();
  if (!dmToken) {
    return NextResponse.json(
      { error: "missing Authorization: Token <dm_token>" },
      { status: 401 },
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured on the server" },
      { status: 500 },
    );
  }

  const incoming = new URL(req.url);
  const target = new URL(`${OPENAI_API_BASE}/${path.join("/")}`);
  incoming.searchParams.forEach((v, k) => target.searchParams.set(k, v));

  const headers = new Headers();
  headers.set("Authorization", `Bearer ${apiKey}`);
  headers.set("Accept", "application/json");
  const ct = req.headers.get("content-type");
  if (ct) headers.set("Content-Type", ct);

  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  let body: ArrayBuffer | undefined;
  if (hasBody) {
    const buf = await req.arrayBuffer();
    if (buf.byteLength > 0) body = buf;
  }

  const upstream = await fetch(target.toString(), {
    method: req.method,
    headers,
    body,
  });

  const respHeaders = new Headers();
  for (const h of ["content-type", "content-length"]) {
    const v = upstream.headers.get(h);
    if (v) respHeaders.set(h, v);
  }
  return new Response(upstream.body, {
    status: upstream.status,
    headers: respHeaders,
  });
}

export {
  proxy as GET,
  proxy as POST,
  proxy as PUT,
  proxy as PATCH,
  proxy as DELETE,
};
