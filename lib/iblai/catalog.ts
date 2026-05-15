/**
 * ibl.ai catalog client.
 *
 * The catalog exposes tenant-scoped resource records for the current user
 * (e.g. private HeyGen avatar groups, saved voices). Each record carries a
 * `data` payload whose shape depends on the `resource_type`.
 *
 *   GET {dmUrl}/api/catalog/resources/
 *     ?username={user}&platform_key={tenant}&resource_type={type}
 *
 * Auth uses the DM token stored in localStorage.
 */

import config from "./config";

export interface CatalogResource<TData = Record<string, unknown>> {
  item_id: string;
  id: number;
  name: string;
  url: string;
  resource_type: string;
  data: TData;
  image: string;
  description: string;
  /** Creator username, set server-side from the POST. May be undefined on
   *  older records created before the field was tracked. */
  username?: string;
}

/** Payload shape for `resource_type === "heygen_private_avatar"`. */
export interface HeygenPrivateAvatarResourceData {
  /** HeyGen avatar group id. Passed as `{group_id}` to /v3/avatars/{group_id}. */
  id: string;
  /** Preview thumbnail URL shown before HeyGen renders its own. */
  image_url?: string;
}

export type HeygenPrivateAvatarResource = CatalogResource<HeygenPrivateAvatarResourceData>;

/**
 * Visibility for a generated video.
 *
 * - `personal`: only the creator sees it in their My Videos page.
 * - `platform`: every admin on the tenant where the video was created
 *   sees it. Default.
 * - `public`: every admin on any tenant the viewer has access to sees
 *   it. The video is duplicated to the `main` tenant catalog with all
 *   playable URLs embedded — Community reads from `main` only.
 */
export type VideoVisibility = "personal" | "platform" | "public";

/** Tenant key where public-video copies live. */
export const PUBLIC_VIDEO_TENANT = "main";

/** Payload shape for `resource_type === "heygen_private_video"`. */
export interface HeygenPrivateVideoResourceData {
  /** HeyGen video id. Passed as `{video_id}` to /v3/videos/{video_id}. */
  id: string;
  /** Preview thumbnail URL shown before HeyGen renders its own. */
  image_url?: string;
  /**
   * Self-contained playable URL — only set on the main-tenant public
   * copy. HeyGen API keys are tenant-scoped, so callers reading the
   * main tenant can't fetch the upstream HeyGen video details. We
   * embed the asset URL here so the Community page can render directly
   * without calling HeyGen.
   */
  video_url?: string;
  /** Display title — set on main-tenant copies for the same reason. */
  title?: string;
  /** Seconds. Embedded on main-tenant copies. */
  duration?: number;
  /** Unix seconds. Embedded on main-tenant copies. */
  created_at?: number;
  /** Sharing scope. Defaults to `platform` when missing. */
  visibility?: VideoVisibility;
  /** Creator username, stashed in the payload as a redundant fallback so
   *  the personal-visibility filter still works on backends that don't
   *  echo `username` at the top level of the resource. */
  username?: string;
  /** When this record is the main-tenant copy of a public video, which
   *  tenant the source lives on. */
  source_platform?: string;
}

export type HeygenPrivateVideoResource = CatalogResource<HeygenPrivateVideoResourceData>;

/** Payload shape for `resource_type === "heygen_private_voice"`. */
export interface HeygenPrivateVoiceResourceData {
  /** HeyGen voice id. Matches the `voice_id` used by `/v3/voices` + video endpoints. */
  id: string;
  language?: string;
  gender?: string;
  preview_audio_url?: string;
}

export type HeygenPrivateVoiceResource = CatalogResource<HeygenPrivateVoiceResourceData>;

/** Payload shape for `resource_type === "video_prompt"`. */
export interface VideoPromptResourceData {
  title: string;
  category: string;
  description: string;
}

export type VideoPromptResource = CatalogResource<VideoPromptResourceData>;

function getDmToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("dm_token") ?? "";
}

function authHeaders(): Record<string, string> {
  const token = getDmToken();
  if (!token) {
    throw new Error("catalog: missing DM token (user not authenticated)");
  }
  return { Authorization: `Token ${token}` };
}

/**
 * Resolve the current user's username from the SDK's `userData` blob in
 * localStorage. Returns an empty string if not logged in.
 */
export function getCurrentUsername(): string {
  if (typeof window === "undefined") return "";
  try {
    const raw = localStorage.getItem("userData");
    if (!raw) return "";
    const parsed = JSON.parse(raw);
    return parsed.user_nicename ?? parsed.username ?? "";
  } catch {
    return "";
  }
}

export interface ListCatalogResourcesOptions {
  /** Tenant/platform key. Required. */
  platform: string;
  username?: string;
  resource_type?: string;
}

/**
 * List catalog resources matching the given filters. Returns a flat array
 * — the endpoint is not paginated.
 *
 * Tenant-wide by default: callers should NOT pass `username` unless they
 * specifically need to scope to one user. Visibility across the tenant
 * (admins ↔ admins, students ← admins) depends on this filter being
 * absent so every resource on the platform is returned regardless of
 * which user originally created it.
 */
export async function listCatalogResources<TData = Record<string, unknown>>(
  options: ListCatalogResourcesOptions,
): Promise<CatalogResource<TData>[]> {
  if (!options.platform) {
    throw new Error("catalog: platform is required");
  }

  const url = new URL(`${config.dmUrl()}/api/catalog/resources/`);
  url.searchParams.set("platform_key", options.platform);
  if (options.username) url.searchParams.set("username", options.username);
  if (options.resource_type) url.searchParams.set("resource_type", options.resource_type);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { ...authHeaders(), Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(
      `catalog resources failed: ${res.status} ${res.statusText}`,
    );
  }
  const json = await res.json();
  if (Array.isArray(json)) return json as CatalogResource<TData>[];
  return (json?.results ?? []) as CatalogResource<TData>[];
}

/**
 * Convenience wrapper: fetch HeyGen private avatar resources on the given
 * tenant. This is intentionally platform-wide — every private avatar
 * registered on the tenant is returned, regardless of which user created
 * it — so individual users can use avatars shared across the platform.
 */
export async function listHeygenPrivateAvatarResources(
  platform: string,
): Promise<HeygenPrivateAvatarResource[]> {
  if (!platform) return [];
  return listCatalogResources<HeygenPrivateAvatarResourceData>({
    platform,
    resource_type: "heygen_private_avatar",
  });
}

/**
 * Convenience wrapper: fetch HeyGen private video resources on the given
 * tenant. Platform-wide — every video registered on the tenant is
 * returned regardless of which user triggered its creation.
 */
export async function listHeygenPrivateVideoResources(
  platform: string,
): Promise<HeygenPrivateVideoResource[]> {
  if (!platform) return [];
  return listCatalogResources<HeygenPrivateVideoResourceData>({
    platform,
    resource_type: "heygen_private_video",
  });
}

export interface CreateCatalogResourceOptions<TData = Record<string, unknown>> {
  /** Tenant/platform key. Required. Transport controlled by `credentialsIn`. */
  platform: string;
  /** Creating user; defaults to `getCurrentUsername()` when omitted.
   *  Transport controlled by `credentialsIn`. */
  username?: string;
  /**
   * Where to place `platform_key` and `username`:
   *   - `"query"` (default): as query-string params, body omits them.
   *   - `"body"`: merged into the JSON body, query string stays empty.
   */
  credentialsIn?: "query" | "body";
  /** Resource type discriminator (e.g. "heygen_private_video"). */
  resource_type: string;
  /** Arbitrary type-specific payload. */
  data: TData;
  name?: string;
  description?: string;
  image?: string;
  url?: string;
}

/**
 * Create a new catalog resource for the given tenant.
 *
 *   POST {dmUrl}/api/catalog/resources/[?platform_key=...&username=...]
 *   { resource_type, data, platform_key?, username?, ... }
 *
 * `platform_key` and `username` may travel either in the query string
 * (default) or in the JSON body, per `options.credentialsIn`.
 */
export async function createCatalogResource<TData = Record<string, unknown>>(
  options: CreateCatalogResourceOptions<TData>,
): Promise<CatalogResource<TData>> {
  if (!options.platform) {
    throw new Error("catalog: platform is required");
  }
  if (!options.resource_type) {
    throw new Error("catalog: resource_type is required");
  }

  const username = options.username ?? getCurrentUsername();
  // The DM catalog endpoint requires `username` on POST — without it the
  // server rejects the request. Listing is tenant-wide (no username sent),
  // but creates always carry the acting user's name.
  if (!username) {
    throw new Error(
      "catalog: username is required to create a resource (user not authenticated)",
    );
  }
  const credentialsIn = options.credentialsIn ?? "query";

  const url = new URL(`${config.dmUrl()}/api/catalog/resources/`);
  if (credentialsIn === "query") {
    url.searchParams.set("platform_key", options.platform);
    url.searchParams.set("username", username);
  }

  const body: Record<string, unknown> = {
    resource_type: options.resource_type,
    data: options.data,
  };
  if (credentialsIn === "body") {
    body.platform_key = options.platform;
    body.username = username;
  }
  if (options.name !== undefined) body.name = options.name;
  if (options.description !== undefined) body.description = options.description;
  if (options.image !== undefined) body.image = options.image;
  if (options.url !== undefined) body.url = options.url;

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      ...authHeaders(),
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(
      `catalog resource create failed: ${res.status} ${res.statusText}`,
    );
  }
  return res.json();
}

/**
 * Register a newly-created HeyGen photo-avatar group as a platform-wide
 * catalog resource so it shows up for every user on `/ai-avatar/my`.
 * `data.id` is the HeyGen `group_id`; the preview thumbnail is stored
 * inside `data.image_url` (not as a top-level `url`/`image`) per the
 * catalog's convention for HeyGen resources.
 */
export async function createHeygenPrivateAvatarResource(
  platform: string,
  groupId: string,
  opts: { name?: string; image_url?: string } = {},
): Promise<HeygenPrivateAvatarResource> {
  return createCatalogResource<HeygenPrivateAvatarResourceData>({
    platform,
    resource_type: "heygen_private_avatar",
    data: {
      id: groupId,
      ...(opts.image_url ? { image_url: opts.image_url } : {}),
    },
    name: opts.name,
    credentialsIn: "body",
  });
}

/**
 * Register a newly-created HeyGen video as a platform-wide catalog
 * resource so it shows up for every user on `/videos/my`. The preview
 * thumbnail is stored inside `data.image_url` (not as a top-level
 * `url`/`image`) per the catalog's video-resource convention.
 */
/**
 * Platform-wide HeyGen private voice resources (cloned voices).
 */
export async function listHeygenPrivateVoiceResources(
  platform: string,
): Promise<HeygenPrivateVoiceResource[]> {
  if (!platform) return [];
  return listCatalogResources<HeygenPrivateVoiceResourceData>({
    platform,
    resource_type: "heygen_private_voice",
  });
}

/**
 * Register a newly-cloned HeyGen voice in the catalog so every user on
 * the tenant can find it without paging through HeyGen's private list.
 */
export async function createHeygenPrivateVoiceResource(
  platform: string,
  voiceId: string,
  opts: {
    name?: string;
    language?: string;
    gender?: string;
    preview_audio_url?: string;
  } = {},
): Promise<HeygenPrivateVoiceResource> {
  return createCatalogResource<HeygenPrivateVoiceResourceData>({
    platform,
    resource_type: "heygen_private_voice",
    data: {
      id: voiceId,
      ...(opts.language ? { language: opts.language } : {}),
      ...(opts.gender ? { gender: opts.gender } : {}),
      ...(opts.preview_audio_url
        ? { preview_audio_url: opts.preview_audio_url }
        : {}),
    },
    name: opts.name,
    credentialsIn: "body",
  });
}

export async function createHeygenPrivateVideoResource(
  platform: string,
  videoId: string,
  opts: {
    name?: string;
    image_url?: string;
    /** Sharing scope. Defaults to `platform`. */
    visibility?: VideoVisibility;
  } = {},
): Promise<HeygenPrivateVideoResource> {
  return createCatalogResource<HeygenPrivateVideoResourceData>({
    platform,
    resource_type: "heygen_private_video",
    data: {
      id: videoId,
      ...(opts.image_url ? { image_url: opts.image_url } : {}),
      visibility: opts.visibility ?? "platform",
      // Redundant: the DM POST already carries `username` in the body
      // (per createCatalogResource), but stashing it in `data` keeps
      // the personal-visibility filter robust against backends that
      // don't echo top-level `username` on the list response.
      username: getCurrentUsername(),
    },
    name: opts.name,
    credentialsIn: "body",
  });
}

/**
 * Mirror a public video onto the `main` tenant catalog with all
 * playable URLs embedded directly in the data payload.
 *
 * The main tenant's HeyGen API key (if any) doesn't know about the
 * source tenant's videos, so the Community page can't call
 * `getHeygenVideoStatus` to resolve a play URL. We persist the URLs
 * here at publish time so the Community page can render straight from
 * the catalog response.
 */
export async function publishVideoToMainTenant(opts: {
  videoId: string;
  title: string;
  videoUrl: string;
  imageUrl: string;
  duration?: number;
  createdAt?: number;
  sourcePlatform: string;
}): Promise<HeygenPrivateVideoResource> {
  return createCatalogResource<HeygenPrivateVideoResourceData>({
    platform: PUBLIC_VIDEO_TENANT,
    resource_type: "heygen_private_video",
    data: {
      id: opts.videoId,
      image_url: opts.imageUrl,
      video_url: opts.videoUrl,
      title: opts.title,
      duration: opts.duration,
      created_at: opts.createdAt,
      visibility: "public",
      username: getCurrentUsername(),
      source_platform: opts.sourcePlatform,
    },
    name: opts.title,
    credentialsIn: "body",
  });
}

/**
 * Find and delete any main-tenant public copies of a HeyGen video.
 * Used when a video's visibility flips away from `public`. Silently
 * succeeds if no copy exists.
 */
export async function unpublishVideoFromMainTenant(
  videoId: string,
): Promise<void> {
  let resources: HeygenPrivateVideoResource[];
  try {
    resources = await listHeygenPrivateVideoResources(PUBLIC_VIDEO_TENANT);
  } catch {
    return;
  }
  const matches = resources.filter((r) => r.data?.id === videoId);
  for (const match of matches) {
    try {
      await deleteCatalogResource(match.id, {
        platform: PUBLIC_VIDEO_TENANT,
        resource_type: "heygen_private_video",
      });
    } catch (err) {
      console.warn(
        "[catalog] unpublishVideoFromMainTenant: delete failed",
        match.id,
        err,
      );
    }
  }
}

/**
 * Change the visibility on an existing video resource.
 *
 * The catalog has no update endpoint, so we delete the source record
 * and re-create it with the new visibility. If the new visibility is
 * `public`, we also mirror the record to the main tenant; if it's
 * leaving `public`, we tear down the main-tenant mirror.
 *
 * Returns the freshly-created source resource. Callers MUST replace
 * the stale resource in their local state with the returned one,
 * otherwise the next visibility flip will try to delete a catalog id
 * that no longer exists.
 */
export async function updateVideoVisibility(opts: {
  resource: HeygenPrivateVideoResource;
  platform: string;
  nextVisibility: VideoVisibility;
  /** Required when transitioning TO public. Embedded in the main copy. */
  publishContext?: {
    videoUrl: string;
    imageUrl: string;
    duration?: number;
    createdAt?: number;
  };
}): Promise<HeygenPrivateVideoResource> {
  const { resource, platform, nextVisibility, publishContext } = opts;
  const currentVisibility = resource.data?.visibility ?? "platform";
  const videoId = resource.data?.id;
  if (!videoId) throw new Error("updateVideoVisibility: resource has no video id");

  // Re-create the source record with the new visibility (delete first
  // because the catalog has no update endpoint).
  await deleteCatalogResource(resource.id, {
    platform,
    resource_type: "heygen_private_video",
  });
  const created = await createHeygenPrivateVideoResource(platform, videoId, {
    name: resource.name,
    image_url: resource.data?.image_url,
    visibility: nextVisibility,
  });

  // Sync the main-tenant mirror.
  if (currentVisibility === "public" && nextVisibility !== "public") {
    await unpublishVideoFromMainTenant(videoId);
  }
  if (nextVisibility === "public" && currentVisibility !== "public") {
    if (!publishContext) {
      throw new Error(
        "updateVideoVisibility: publishContext required to make a video public",
      );
    }
    await publishVideoToMainTenant({
      videoId,
      title: resource.name || resource.data?.title || `Video ${videoId}`,
      videoUrl: publishContext.videoUrl,
      imageUrl: publishContext.imageUrl,
      duration: publishContext.duration,
      createdAt: publishContext.createdAt,
      sourcePlatform: platform,
    });
  }

  return created;
}

export interface DeleteCatalogResourceOptions {
  /** Tenant/platform key. Required. */
  platform: string;
  /** Resource type discriminator (e.g. "video_prompt"). Required. */
  resource_type: string;
  /** Acting user; defaults to `getCurrentUsername()` when omitted. */
  username?: string;
}

/**
 * Delete a catalog resource by its numeric `id`.
 *
 *   DELETE {dmUrl}/api/catalog/resources/
 *     ?id=<id>&resource_type=<type>&platform_key=<tenant>&username=<user>
 *
 * All identifiers travel in the query string. The backend has no update
 * endpoint — callers update by deleting and re-creating.
 */
export async function deleteCatalogResource(
  id: number,
  options: DeleteCatalogResourceOptions,
): Promise<void> {
  if (!options.platform) {
    throw new Error("catalog: platform is required");
  }
  if (!options.resource_type) {
    throw new Error("catalog: resource_type is required");
  }
  const username = options.username ?? getCurrentUsername();

  const url = new URL(`${config.dmUrl()}/api/catalog/resources/`);
  url.searchParams.set("id", String(id));
  url.searchParams.set("resource_type", options.resource_type);
  url.searchParams.set("platform_key", options.platform);
  if (username) url.searchParams.set("username", username);

  const res = await fetch(url.toString(), {
    method: "DELETE",
    headers: { ...authHeaders(), Accept: "application/json" },
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(
      `catalog resource delete failed: ${res.status} ${res.statusText}`,
    );
  }
}

/**
 * Platform-wide video prompt gallery entries. Each prompt is tenant-scoped
 * and shared across all users on the platform.
 */
export async function listVideoPromptResources(
  platform: string,
): Promise<VideoPromptResource[]> {
  if (!platform) return [];
  return listCatalogResources<VideoPromptResourceData>({
    platform,
    resource_type: "video_prompt",
  });
}

export async function createVideoPromptResource(
  platform: string,
  prompt: VideoPromptResourceData,
): Promise<VideoPromptResource> {
  return createCatalogResource<VideoPromptResourceData>({
    platform,
    resource_type: "video_prompt",
    data: prompt,
    name: prompt.title,
    description: prompt.description,
    credentialsIn: "body",
  });
}
