import type { Page, Route } from "@playwright/test";

/**
 * Default fixtures for the HeyGen proxy + ibl.ai catalog. Each helper
 * returns the JSON the upstream endpoint would.
 */
export const fixtures = {
  publicVoice: {
    voice_id: "voice-public-1",
    name: "Public Voice One",
    language: "English",
    gender: "female",
    preview_audio_url: null,
    type: "public" as const,
  },
  privateVoice: {
    voice_id: "voice-private-1",
    name: "Private Clone",
    language: "English",
    gender: "male",
    preview_audio_url: null,
    type: "private" as const,
  },
  publicAvatar: {
    id: "avatar-1",
    name: "Sample Avatar",
    preview_image_url: "https://example.com/avatar.png",
    status: "completed",
  },
  videoDetail: {
    id: "video-1",
    title: "Sample Video",
    status: "completed",
    video_url: "https://example.com/video.mp4",
    thumbnail_url: "https://example.com/thumb.png",
    duration: 12,
    created_at: 1700000000,
  },
};

/**
 * Intercept every `/api/heygen/*` proxy call and return canned JSON so
 * journeys don't touch HeyGen. Override per-route via the
 * `overrides` map (key is the path suffix after `/api/heygen/`).
 */
export async function mockHeygenProxy(
  page: Page,
  overrides: Record<string, (route: Route) => Promise<void> | void> = {},
) {
  await page.route("**/api/heygen/**", async (route) => {
    const url = new URL(route.request().url());
    const suffix = url.pathname.replace(/^\/api\/heygen\//, "");
    const override = overrides[suffix] ?? overrides[suffix.replace(/\/$/, "")];
    if (override) return override(route);

    // Default responses by endpoint.
    if (suffix.startsWith("v3/voices/speech")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: { audio_url: "https://example.com/tts.mp3", duration: 1.5 },
        }),
      });
    }
    if (suffix.startsWith("v3/voices/clone")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { voice_clone_id: "voice-private-new" } }),
      });
    }
    if (suffix.startsWith("v3/voices")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [fixtures.publicVoice],
          has_more: false,
          next_token: null,
        }),
      });
    }
    if (suffix.startsWith("v3/videos") && route.request().method() === "POST") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { video_id: "video-new" } }),
      });
    }
    if (suffix.startsWith("v3/videos")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [fixtures.videoDetail],
          has_more: false,
          next_token: null,
        }),
      });
    }
    if (suffix.startsWith("v3/avatars") || suffix.startsWith("v1/streaming")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [fixtures.publicAvatar] }),
      });
    }
    if (suffix.startsWith("v1/asset")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            id: "asset-1",
            image_key: "key-1",
            file_type: "image/png",
            url: "https://example.com/asset.png",
          },
        }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "{}",
    });
  });
}

/**
 * Intercept ibl.ai catalog requests so tests don't depend on a live DM.
 */
export async function mockCatalog(page: Page) {
  await page.route("**/api/catalog/resources/**", async (route) => {
    const method = route.request().method();
    if (method === "POST") {
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          item_id: "res-1",
          id: 1,
          name: "Created",
          url: "",
          resource_type: "video_prompt",
          data: {},
          image: "",
          description: "",
        }),
      });
    }
    if (method === "DELETE") {
      return route.fulfill({ status: 204, body: "" });
    }
    // The Community page reads `heygen_private_video` resources from
    // the main tenant and filters for `visibility === "public"`. Seed
    // that query with a single public video so the grid renders.
    const url = new URL(route.request().url());
    const isPublicVideoQuery =
      url.searchParams.get("platform_key") === "main" &&
      url.searchParams.get("resource_type") === "heygen_private_video";
    if (isPublicVideoQuery) {
      const titleFilter = (url.searchParams.get("title") ?? "").toLowerCase();
      const sampleTitle = "Sample Video";
      const matches =
        !titleFilter || sampleTitle.toLowerCase().includes(titleFilter);
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          results: matches
            ? [
                {
                  item_id: "res-pub-1",
                  id: 1,
                  name: sampleTitle,
                  url: "",
                  resource_type: "heygen_private_video",
                  data: {
                    id: "video-pub-1",
                    title: sampleTitle,
                    visibility: "public",
                    video_url: "https://example.com/video.mp4",
                    image_url: "https://example.com/thumb.png",
                    duration: 12,
                    created_at: 1700000000,
                  },
                  image: "",
                  description: "",
                },
              ]
            : [],
        }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ results: [] }),
    });
  });
}

/**
 * Intercept `/api/openai/*` proxy calls so journeys never hit OpenAI.
 * Returns a chat-completions-shaped envelope by default; Whisper
 * transcription returns plain text. Override per-suffix as needed.
 */
export async function mockOpenaiProxy(
  page: Page,
  overrides: Record<string, (route: Route) => Promise<void> | void> = {},
) {
  await page.route("**/api/openai/**", async (route) => {
    const url = new URL(route.request().url());
    const suffix = url.pathname.replace(/^\/api\/openai\//, "");
    const override = overrides[suffix] ?? overrides[suffix.replace(/\/$/, "")];
    if (override) return override(route);

    if (suffix.startsWith("v1/audio/transcriptions")) {
      return route.fulfill({
        status: 200,
        contentType: "text/plain",
        body: "mock transcript",
      });
    }
    if (suffix.startsWith("v1/chat/completions")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          choices: [{ message: { content: "mock completion" } }],
        }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "{}",
    });
  });
}

/**
 * Stub the DM integration-credential probe so HeygenGuard never gates
 * the app on a tenant that's missing a key. Returns a plausible heygen
 * credential by default.
 */
export async function mockIntegrationCredential(page: Page) {
  await page.route("**/integration-credential/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          name: "heygen",
          value: { key: "stub-heygen-key" },
          platform: "test",
        },
      ]),
    });
  });
}

/**
 * Stub the SDK's `getUserTenants` call (`/users/manage/platform/`)
 * with an explicit response. Opt-in helper used by the admin-gate
 * spec to force an empty tenants list so `useIsAdmin` returns false.
 *
 * NOT wired into `setupFakes` — the default journey behaviour is to
 * let the real LMS reply through, so `TenantProvider` restores the
 * SSO user's tenants (with `is_admin: true`) and journeys aren't
 * gated by AdminGuard.
 *
 * IMPORTANT: do NOT call `page.evaluate` from inside the route
 * handler. Playwright's route handlers run on a separate channel and
 * `page.evaluate` waits for the in-flight request — deadlock.
 */
export async function mockUserTenants(
  page: Page,
  body: unknown = [],
) {
  await page.route("**/users/manage/platform/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
}

/**
 * Stub the SDK's billing-account probe so `<CreditBalance>` doesn't
 * surface a "failed to load credit balance" error when a journey
 * happens to mount it. Returns a Free-plan envelope by default —
 * enough for the trigger icon to render.
 */
export async function mockBillingAccount(page: Page) {
  await page.route("**/api/billing/account/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        plan: "Free",
        credits_remaining: 100,
        credits_consumed: 0,
        reset_date: null,
      }),
    });
  });
  await page.route("**/api/billing/platforms**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });
}

/**
 * Force the user's tenants list (as returned by the SDK's
 * `/users/manage/platform/` call) to carry both `is_admin: true` and
 * `show_paywall: true` so `<IblaiCreditBalance>`'s gates resolve.
 *
 * Implementation note: also patches `localStorage.tenants` via
 * `addInitScript`, but that copy is overwritten as soon as the SDK
 * re-fetches the platform endpoint. The real fix is to intercept the
 * upstream response, forward it, and rewrite each entry.
 */
export async function seedPaywallTenant(page: Page) {
  await page.addInitScript(() => {
    try {
      const raw = localStorage.getItem("tenants");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const list = Array.isArray(parsed) ? parsed : [parsed];
      const patched = list.map(
        (t: Record<string, unknown>) =>
          ({ ...t, is_admin: true, show_paywall: true }) as Record<
            string,
            unknown
          >,
      );
      localStorage.setItem("tenants", JSON.stringify(patched));
    } catch {
      /* ignore */
    }
  });

  await page.route("**/users/manage/platform/**", async (route) => {
    try {
      const response = await route.fetch();
      const body = await response.json();
      const list = Array.isArray(body) ? body : [body];
      const patched = list.map((t: Record<string, unknown>) => ({
        ...t,
        is_admin: true,
        show_paywall: true,
      }));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(Array.isArray(body) ? patched : patched[0]),
      });
    } catch {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "[]",
      });
    }
  });
}

/**
 * Stub /api/heygen, /api/catalog, /api/openai, and the DM
 * `integration-credential` probe so journeys assert against
 * predictable data regardless of what the SSO tenant has provisioned.
 *
 * The integration-credential stub is needed because `HeygenGuard`
 * fetches the heygen key on every page load — if the SSO user's
 * tenant happens to return masked / missing / permission-blocked
 * data, every journey ends up at the "HeyGen integration required"
 * gate.
 *
 * `/users/manage/platform/` is intentionally NOT stubbed — the SDK's
 * real LMS response carries the SSO user's `is_admin: true` flag, and
 * stubbing it with an empty array would gate every test on AdminGuard.
 * The admin-gate spec calls `mockUserTenants(page, [])` explicitly to
 * force the negative branch.
 */
export async function setupFakes(
  page: Page,
  hooks: {
    heygenOverrides?: Parameters<typeof mockHeygenProxy>[1];
    openaiOverrides?: Parameters<typeof mockOpenaiProxy>[1];
  } = {},
) {
  await mockHeygenProxy(page, hooks.heygenOverrides);
  await mockCatalog(page);
  await mockOpenaiProxy(page, hooks.openaiOverrides);
  await mockIntegrationCredential(page);
  await mockBillingAccount(page);
}
