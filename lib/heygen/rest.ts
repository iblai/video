/**
 * HeyGen REST client (browser).
 *
 * Every request goes through `/api/heygen/<path>` — our same-origin
 * server proxy, which resolves the tenant's HeyGen API key via ibl.ai's
 * ai-account service and forwards the call to `api.heygen.com`. The
 * browser never sees a HeyGen API key; it only presents its ibl.ai DM
 * token so the server can look up the right credential.
 *
 * HeyGen response shapes are returned unmodified so callers see exactly
 * what the upstream produced.
 */
import { resolveAppTenant } from "@/lib/iblai/tenant"
import { withBasePath } from "@/lib/iblai/base-path"

// API routes share the app's `basePath` (Next mounts everything --
// pages AND `/api/*` -- under the configured prefix). Raw fetches use
// this rooted path; Next's helpers (Link, router) prefix
// automatically, but `fetch("/api/...")` does not.
const API_BASE = withBasePath("/api/heygen")

function getDmToken(): string {
  if (typeof window === "undefined") return ""
  return localStorage.getItem("dm_token") ?? ""
}

function authHeaders(platformOverride?: string): Record<string, string> {
  const token = getDmToken()
  if (!token) throw new Error("heygen: missing DM token (user not authenticated)")
  const platform = platformOverride || resolveAppTenant()
  if (!platform) throw new Error("heygen: no tenant resolved")
  return {
    Authorization: `Token ${token}`,
    "X-Platform": platform,
  }
}

export interface HeygenRestInit extends Omit<RequestInit, "headers" | "body"> {
  query?: Record<string, string | number | boolean | undefined | null>
  headers?: Record<string, string>
  body?: unknown
  /** Override the `X-Platform` tenant for this request (e.g. main tenant). */
  platform?: string
}

async function request<T>(path: string, init: HeygenRestInit = {}): Promise<T> {
  const url = new URL(`${API_BASE}${path}`, window.location.origin)
  if (init.query) {
    for (const [k, v] of Object.entries(init.query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v))
    }
  }
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...authHeaders(init.platform),
    ...(init.headers ?? {}),
  }

  let body: BodyInit | undefined
  if (init.body instanceof FormData || init.body instanceof Blob) {
    body = init.body
  } else if (init.body !== undefined) {
    body = JSON.stringify(init.body)
    headers["Content-Type"] = "application/json"
  }

  const res = await fetch(url.toString(), { ...init, headers, body })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`heygen ${path}: ${res.status} ${text.slice(0, 300)}`)
  }
  return (await res.json()) as T
}

/** HeyGen wraps every successful v3 payload in `{data: ...}`. Unwrap here. */
function unwrap<T>(res: { data?: T } & Partial<T>): T {
  return (res.data as T | undefined) ?? (res as T)
}

// ──────────────────────────────────────────────────────────────────────
// Voices

export interface HeygenVoice {
  voice_id: string
  name: string
  language?: string
  gender?: string
  preview_audio_url?: string | null
  support_pause?: boolean
  support_locale?: boolean
  type?: "public" | "private"
}

export interface HeygenVoicePage {
  data: HeygenVoice[]
  has_more?: boolean
  next_token?: string | null
}

export interface ListHeygenVoicesOptions {
  type?: "public" | "private"
  engine?: string
  language?: string
  gender?: "male" | "female"
  limit?: number
  token?: string
}

export async function listHeygenVoicesPage(
  opts: ListHeygenVoicesOptions = {},
): Promise<HeygenVoicePage> {
  const res = await request<HeygenVoicePage>("/v3/voices", {
    method: "GET",
    query: {
      type: opts.type,
      engine: opts.engine,
      language: opts.language,
      gender: opts.gender,
      limit: opts.limit,
      token: opts.token,
    },
  })
  return {
    data: res.data ?? [],
    has_more: res.has_more,
    next_token: res.next_token ?? null,
  }
}

// ──────────────────────────────────────────────────────────────────────
// Avatar groups
//
// Each HeyGen avatar group (ag_/lk_ id) is what users see as a single
// "avatar" in the UI. The group endpoint returns training status at the
// group level — poll it while `status === "processing"` to surface
// progress indicators.

export interface HeygenAvatar {
  id: string
  name: string
  preview_image_url?: string
  preview_video_url?: string
  created_at?: number
  looks_count?: number
  gender?: string
  premium?: boolean
  tags?: string[]
  default_voice_id?: string
  /** Training status — "processing" until HeyGen finishes. */
  status?: "processing" | "completed" | "failed" | string
  /** Consent gate for digital twins. */
  consent_status?: "skipped" | "completed" | "required" | string
}

export async function getHeygenAvatarGroup(
  groupId: string,
): Promise<HeygenAvatar> {
  const res = await request<{ data?: HeygenAvatar } & Partial<HeygenAvatar>>(
    `/v3/avatars/${encodeURIComponent(groupId)}`,
    { method: "GET" },
  )
  return unwrap(res)
}

// ──────────────────────────────────────────────────────────────────────
// Photo avatar creation
//
// Multi-step HeyGen pipeline:
//   1. POST /v1/asset                      → { image_key }
//   2. POST /v2/photo_avatar/avatar_group/create  { name, image_key } → { group_id }
//   3. POST /v2/photo_avatar/train         { group_id }
//   4. GET  /v2/photo_avatar/train/status/{group_id}  → { status: "pending"|"ready" }
//
// Step 1 hits upload.heygen.com (not api.heygen.com) — the proxy routes
// `/v1/asset*` to the correct upstream.

export interface HeygenUploadedAsset {
  /** Internal asset id. */
  id: string
  /** What downstream photo-avatar endpoints consume. */
  image_key: string
  file_type: string
  url: string
}

/**
 * HeyGen returns two kinds of image URLs:
 *   - Unsigned long-lived paths on `resource2.heygen.ai/image/...`
 *     (what `/v1/asset` hands back). Safe to store in the catalog.
 *   - Signed CloudFront URLs on `files2.heygen.ai/...?Expires=...&
 *     Signature=...&Key-Pair-Id=...` (what avatar/look/group responses
 *     hand back). These expire — usually within a few days — so we
 *     must not persist them.
 *
 * Any time we're about to persist an image URL we go through
 * `ensureUnsignedImageUrl`: if already unsigned, it's a no-op; if
 * signed, we fetch the bytes and re-upload to `/v1/asset` to swap it
 * for a stable unsigned URL.
 */
export function isSignedHeygenUrl(url: string): boolean {
  if (!url) return false
  try {
    const u = new URL(url, window.location.origin)
    return u.searchParams.has("Signature") || u.searchParams.has("Expires")
  } catch {
    return false
  }
}

export async function ensureUnsignedImageUrl(url: string): Promise<string> {
  if (!url || !isSignedHeygenUrl(url)) return url
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`heygen re-host: fetch ${res.status} ${url.slice(0, 120)}`)
  }
  const blob = await res.blob()
  const uploaded = await uploadHeygenAsset(blob)
  return uploaded.url
}

/**
 * Extract a single JPEG frame from a video file using a hidden
 * `<video>` + `<canvas>`. Used to capture a thumbnail at digital-twin
 * creation time since HeyGen's `/v3/avatars` returns unsigned preview
 * URLs that CloudFront rejects with 403 for browsers.
 */
export async function extractVideoFrameJpeg(
  file: File,
  opts: { atSeconds?: number; quality?: number; maxDim?: number } = {},
): Promise<Blob> {
  if (typeof window === "undefined") throw new Error("heygen: browser-only")
  const { atSeconds = 0.5, quality = 0.85, maxDim = 512 } = opts

  const video = document.createElement("video")
  video.muted = true
  video.playsInline = true
  video.preload = "auto"
  video.crossOrigin = "anonymous"
  const objectUrl = URL.createObjectURL(file)
  video.src = objectUrl

  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve()
      video.onerror = () => reject(new Error("heygen: failed to read video metadata"))
    })
    const t = Math.min(atSeconds, Math.max(0, (video.duration || 1) / 2))
    video.currentTime = t
    await new Promise<void>((resolve, reject) => {
      video.onseeked = () => resolve()
      video.onerror = () => reject(new Error("heygen: failed to seek video"))
    })

    const w = video.videoWidth || 512
    const h = video.videoHeight || 512
    const scale = Math.min(1, maxDim / Math.max(w, h))
    const canvas = document.createElement("canvas")
    canvas.width = Math.round(w * scale)
    canvas.height = Math.round(h * scale)
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("heygen: no 2d canvas context")
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error("heygen: canvas toBlob failed")),
        "image/jpeg",
        quality,
      )
    })
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export async function uploadHeygenAsset(
  file: File | Blob,
): Promise<HeygenUploadedAsset> {
  const res = await fetch(`${API_BASE}/v1/asset`, {
    method: "POST",
    headers: {
      ...authHeaders(),
      "Content-Type": file.type || "application/octet-stream",
      Accept: "application/json",
    },
    body: file,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`heygen /v1/asset: ${res.status} ${text.slice(0, 300)}`)
  }
  const json = (await res.json()) as {
    data?: HeygenUploadedAsset
  } & Partial<HeygenUploadedAsset>
  return unwrap(json)
}

export interface CreateHeygenPhotoAvatarGroupInput {
  name: string
  image_key: string
}

export interface HeygenPhotoAvatarGroup {
  /** Group id — used everywhere downstream (train, status, list). */
  group_id: string
  /** Id of the individual look within the group. */
  id?: string
  image_url?: string
}

export async function createHeygenPhotoAvatarGroup(
  input: CreateHeygenPhotoAvatarGroupInput,
): Promise<HeygenPhotoAvatarGroup> {
  const res = await request<
    { data?: HeygenPhotoAvatarGroup } & Partial<HeygenPhotoAvatarGroup>
  >("/v2/photo_avatar/avatar_group/create", { method: "POST", body: input })
  return unwrap(res)
}

export interface HeygenPhotoAvatarLookDetail {
  id: string
  group_id: string
  name: string
  status: "pending" | "completed" | "failed" | string
  image_url?: string
}

/**
 * Fetch the look (photo) belonging to a group. Immediately after
 * `createHeygenPhotoAvatarGroup` returns, the photo is still processing
 * server-side — poll this until `status === "completed"` before calling
 * `trainHeygenPhotoAvatarGroup`.
 */
export async function getHeygenPhotoAvatarLook(
  lookOrGroupId: string,
): Promise<HeygenPhotoAvatarLookDetail> {
  const res = await request<
    { data?: HeygenPhotoAvatarLookDetail } & Partial<HeygenPhotoAvatarLookDetail>
  >(`/v2/photo_avatar/${encodeURIComponent(lookOrGroupId)}`, { method: "GET" })
  return unwrap(res)
}

export interface TrainHeygenPhotoAvatarResponse {
  flow_id?: string
}

export async function trainHeygenPhotoAvatarGroup(
  groupId: string,
): Promise<TrainHeygenPhotoAvatarResponse> {
  // The train endpoint wraps its payload in a nested `{data: {data: {...}}}`
  // envelope (see docs). Peel both layers.
  const res = await request<{
    data?: { data?: TrainHeygenPhotoAvatarResponse }
  }>("/v2/photo_avatar/train", {
    method: "POST",
    body: { group_id: groupId },
  })
  return res.data?.data ?? {}
}

/**
 * Wait for HeyGen to finish processing the uploaded photo, then kick
 * off training. Polls the look detail every `intervalMs` up to
 * `timeoutMs` total. Rejects if the photo enters a `failed` state or
 * processing exceeds the timeout.
 */
export async function finalizeAndTrainPhotoAvatarGroup(
  groupId: string,
  { intervalMs = 2000, timeoutMs = 60000 }: {
    intervalMs?: number
    timeoutMs?: number
  } = {},
): Promise<TrainHeygenPhotoAvatarResponse> {
  const deadline = Date.now() + timeoutMs
  // Poll the look detail — `id` equals `group_id` when the group has one
  // look, which is the case for single-photo uploads.
  for (;;) {
    const look = await getHeygenPhotoAvatarLook(groupId)
    if (look.status === "completed") break
    if (look.status === "failed") {
      throw new Error(`HeyGen photo processing failed (${look.status})`)
    }
    if (Date.now() > deadline) {
      throw new Error(
        `HeyGen photo processing timed out (last status: ${look.status})`,
      )
    }
    await new Promise((r) => setTimeout(r, intervalMs))
  }
  return trainHeygenPhotoAvatarGroup(groupId)
}

export type HeygenPhotoAvatarTrainStatus = "pending" | "ready" | string

export interface HeygenPhotoAvatarTrainDetail {
  status: HeygenPhotoAvatarTrainStatus
  error_msg?: string | null
  created_at?: number
  updated_at?: number | null
}

export async function getHeygenPhotoAvatarTrainStatus(
  groupId: string,
): Promise<HeygenPhotoAvatarTrainDetail> {
  const res = await request<
    { data?: HeygenPhotoAvatarTrainDetail } & Partial<HeygenPhotoAvatarTrainDetail>
  >(`/v2/photo_avatar/train/status/${encodeURIComponent(groupId)}`, {
    method: "GET",
  })
  return unwrap(res)
}

// ──────────────────────────────────────────────────────────────────────
// Digital twin avatar creation (video)
//
// HeyGen's unified v3 avatar endpoint accepts `type: "digital_twin"` with
// a video asset_id. Training runs async; poll the look by id. Tenants
// with consent enforcement turned on get a `consent_status: "required"`
// on the group and need the subject to visit a consent URL.

export interface HeygenAvatarLook {
  id: string
  name: string
  group_id: string
  avatar_type: "digital_twin" | "photo_avatar" | "studio_avatar" | string
  status: "processing" | "completed" | "failed" | string
  preview_image_url?: string
  error?: { code: string; message: string } | null
}

export interface CreateHeygenDigitalTwinResponse {
  avatar_group: HeygenAvatar
  avatar_item: HeygenAvatarLook
}

export async function createHeygenDigitalTwinAvatar(input: {
  name: string
  asset_id: string
}): Promise<CreateHeygenDigitalTwinResponse> {
  const res = await request<
    { data?: CreateHeygenDigitalTwinResponse } & Partial<CreateHeygenDigitalTwinResponse>
  >("/v3/avatars", {
    method: "POST",
    body: {
      type: "digital_twin",
      name: input.name,
      file: { type: "asset_id", asset_id: input.asset_id },
    },
  })
  return unwrap(res)
}

/**
 * List every look in a group. Needed because `/v2/video/generate`
 * wants a look_id, but our catalog stores group_id — for digital twins
 * the two differ, so we have to resolve at video-creation time.
 */
export async function listHeygenAvatarLooks(opts: {
  groupId: string
}): Promise<{ data: HeygenAvatarLook[]; has_more?: boolean }> {
  const res = await request<{ data?: HeygenAvatarLook[]; has_more?: boolean }>(
    "/v3/avatars/looks",
    { method: "GET", query: { group_id: opts.groupId } },
  )
  return { data: res.data ?? [], has_more: res.has_more }
}

/**
 * Resolve a usable look_id for a group. Returns the first look whose
 * `status === "completed"`; if nothing is completed yet, throws.
 */
export async function resolveHeygenLookId(groupId: string): Promise<string> {
  const { data } = await listHeygenAvatarLooks({ groupId })
  const ready = data.find((l) => l.status === "completed")
  if (ready) return ready.id
  if (data.length > 0) {
    throw new Error(
      `HeyGen avatar not ready — status: ${data[0].status}${
        data[0].error?.message ? ` (${data[0].error.message})` : ""
      }`,
    )
  }
  throw new Error(`HeyGen avatar has no looks (group_id: ${groupId})`)
}

export async function getHeygenAvatarLook(
  lookId: string,
): Promise<HeygenAvatarLook> {
  const res = await request<
    { data?: HeygenAvatarLook } & Partial<HeygenAvatarLook>
  >(`/v3/avatars/looks/${encodeURIComponent(lookId)}`, { method: "GET" })
  return unwrap(res)
}

export interface HeygenAvatarConsent {
  consent_url: string
}

/**
 * Generate an in-browser consent URL the subject must visit before
 * HeyGen will finish training a digital-twin avatar. Only required when
 * the group's `consent_status === "required"`.
 */
export async function createHeygenAvatarConsentUrl(
  groupId: string,
): Promise<HeygenAvatarConsent> {
  const res = await request<
    { data?: HeygenAvatarConsent } & Partial<HeygenAvatarConsent>
  >(`/v3/avatars/${encodeURIComponent(groupId)}/consent`, { method: "POST" })
  return unwrap(res)
}

// ──────────────────────────────────────────────────────────────────────
// Video generation + status

export type HeygenVideoAspectRatio = "16:9" | "9:16"
export type HeygenVideoResolution = "720p" | "1080p" | "4k"

export interface CreateHeygenVideoInput {
  avatar_id: string
  voice_id: string
  script: string
  aspect_ratio?: HeygenVideoAspectRatio
  title?: string
}

const DIMENSIONS: Record<
  HeygenVideoAspectRatio,
  { width: number; height: number }
> = {
  "16:9": { width: 1280, height: 720 },
  "9:16": { width: 720, height: 1280 },
}

export interface CreateHeygenVideoResponse {
  video_id: string
}

/**
 * Kick off a text-to-video generation against HeyGen's classic video
 * endpoint. Returns `{video_id}` — poll `getHeygenVideoStatus(video_id)`
 * until status transitions to "completed" or "failed".
 */
export async function createHeygenVideo(
  input: CreateHeygenVideoInput,
): Promise<CreateHeygenVideoResponse> {
  const dim = DIMENSIONS[input.aspect_ratio ?? "16:9"]
  const res = await request<
    { data?: CreateHeygenVideoResponse } & Partial<CreateHeygenVideoResponse>
  >("/v2/video/generate", {
    method: "POST",
    body: {
      video_inputs: [
        {
          character: {
            type: "avatar",
            avatar_id: input.avatar_id,
            avatar_style: "normal",
          },
          voice: {
            type: "text",
            voice_id: input.voice_id,
            input_text: input.script,
          },
        },
      ],
      dimension: dim,
      title: input.title,
    },
  })
  return unwrap(res)
}

// ──────────────────────────────────────────────────────────────────────
// Video clip generation (v3)
//
// `/v3/videos` is HeyGen's newer endpoint that supports two discriminated
// variants: an "avatar" mode (avatar_id + script) and an "image" mode
// (image asset + motion_prompt). We use it for the reference-image-to-
// video flow on /videos/generate. Returns `{video_id}` immediately; poll
// `getHeygenVideoStatus` until status transitions to "completed"/"failed".

export type HeygenVideoClipAspectRatio = "16:9" | "9:16" | "1:1"

export interface CreateHeygenVideoClipInput {
  /** Uploaded asset id from `POST /v1/asset`. Mutually exclusive with `image_url`. */
  image_asset_id?: string
  /** Public image URL. Mutually exclusive with `image_asset_id`. */
  image_url?: string
  /** Natural-language description of the desired motion/scene. */
  motion_prompt?: string
  /** TTS text for the image-avatar to speak. Required unless audio is provided. */
  script?: string
  /** Voice id for the TTS script. Required alongside `script`. */
  voice_id?: string
  aspect_ratio?: HeygenVideoClipAspectRatio
  title?: string
}

export interface CreateHeygenVideoClipResponse {
  video_id: string
  status?: string
  output_format?: string
}

export async function createHeygenVideoClip(
  input: CreateHeygenVideoClipInput,
): Promise<CreateHeygenVideoClipResponse> {
  if (!input.image_asset_id && !input.image_url) {
    throw new Error("createHeygenVideoClip: need image_asset_id or image_url")
  }
  const image = input.image_asset_id
    ? { type: "asset_id", asset_id: input.image_asset_id }
    : { type: "url", url: input.image_url }
  const res = await request<
    { data?: CreateHeygenVideoClipResponse } & Partial<CreateHeygenVideoClipResponse>
  >("/v3/videos", {
    method: "POST",
    body: {
      type: "image",
      image,
      motion_prompt: input.motion_prompt,
      script: input.script,
      voice_id: input.voice_id,
      aspect_ratio: input.aspect_ratio,
      title: input.title,
    },
  })
  return unwrap(res)
}

// ──────────────────────────────────────────────────────────────────────
// Voice cloning (v3)
//
// `/v3/voices/clone` accepts an audio sample (URL, uploaded asset id, or
// base64) and returns a `voice_clone_id`. Once the clone finishes
// processing HeyGen surfaces it under `/v3/voices?type=private`.

export interface CloneHeygenVoiceInput {
  voice_name: string
  /** Uploaded asset id from `POST /v1/asset`. Mutually exclusive with the others. */
  audio_asset_id?: string
  /** Public audio URL. Mutually exclusive with the others. */
  audio_url?: string
  /** Optional ISO language hint (e.g. "en", "es"). Auto-detected if omitted. */
  language?: string
  /** Defaults to `true` on the server. */
  remove_background_noise?: boolean
}

export interface CloneHeygenVoiceResponse {
  voice_clone_id: string
}

export async function cloneHeygenVoice(
  input: CloneHeygenVoiceInput,
): Promise<CloneHeygenVoiceResponse> {
  if (!input.audio_asset_id && !input.audio_url) {
    throw new Error("cloneHeygenVoice: need audio_asset_id or audio_url")
  }
  const audio = input.audio_asset_id
    ? { type: "asset_id", asset_id: input.audio_asset_id }
    : { type: "url", url: input.audio_url }
  const res = await request<
    { data?: CloneHeygenVoiceResponse } & Partial<CloneHeygenVoiceResponse>
  >("/v3/voices/clone", {
    method: "POST",
    body: {
      voice_name: input.voice_name,
      audio,
      language: input.language,
      remove_background_noise: input.remove_background_noise,
    },
  })
  return unwrap(res)
}

// ──────────────────────────────────────────────────────────────────────
// Text-to-speech (v3)
//
// `/v3/voices/speech` synthesises a short clip (up to 5000 chars) for
// the given voice and returns a CDN URL to the generated audio. Used by
// the script editor's "Play" control to preview a voice + script.

export interface GenerateHeygenSpeechInput {
  text: string
  voice_id: string
  input_type?: "text" | "ssml"
  speed?: number
  language?: string
  locale?: string
}

export interface GenerateHeygenSpeechResponse {
  audio_url: string
  duration?: number
  request_id?: string | null
  word_timestamps?: { word: string; start: number; end: number }[] | null
}

export async function generateHeygenSpeech(
  input: GenerateHeygenSpeechInput,
): Promise<GenerateHeygenSpeechResponse> {
  const res = await request<
    { data?: GenerateHeygenSpeechResponse } & Partial<GenerateHeygenSpeechResponse>
  >("/v3/voices/speech", {
    method: "POST",
    body: {
      text: input.text,
      voice_id: input.voice_id,
      input_type: input.input_type,
      speed: input.speed,
      language: input.language,
      locale: input.locale,
    },
  })
  return unwrap(res)
}

export type HeygenVideoStatus =
  | "pending"
  | "waiting"
  | "processing"
  | "completed"
  | "failed"

export interface HeygenVideoDetail {
  id: string
  status: HeygenVideoStatus | string
  video_url?: string
  thumbnail_url?: string
  gif_url?: string
  captioned_video_url?: string
  subtitle_url?: string
  duration?: number
  created_at?: number
  completed_at?: number
  title?: string
  video_page_url?: string
  output_language?: string
  failure_code?: string
  failure_message?: string
}

// ──────────────────────────────────────────────────────────────────────
// Interactive streaming
//
// Real-time WebRTC avatar powered by HeyGen's `/v1/streaming.*` endpoints
// + LiveKit. The server proxy attaches the API key to `streaming.new`;
// subsequent room/WebSocket traffic uses the returned `access_token`
// and goes direct from the browser to LiveKit (no proxy hop).

export type HeygenStreamingQuality = "low" | "medium" | "high"

export interface CreateHeygenStreamingSessionInput {
  avatar_name: string
  quality?: HeygenStreamingQuality
  voice?: {
    voice_id?: string
    rate?: number
    emotion?: "excited" | "serious" | "friendly" | "soothing" | "broadcaster"
  }
  language?: string
  knowledge_base?: string
  knowledge_base_id?: string
  disable_idle_timeout?: boolean
  activity_idle_timeout?: number
}

export interface HeygenStreamingSession {
  session_id: string
  /** LiveKit JWT — use as access token when joining the room + WS. */
  access_token: string
  /** LiveKit room WebSocket URL (`wss://...livekit.cloud`). */
  url: string
  is_paid?: boolean
  session_duration_limit?: number
}

export async function createHeygenStreamingSession(
  input: CreateHeygenStreamingSessionInput,
): Promise<HeygenStreamingSession> {
  const res = await request<
    { data?: HeygenStreamingSession } & Partial<HeygenStreamingSession>
  >("/v1/streaming.new", {
    method: "POST",
    body: {
      avatar_name: input.avatar_name,
      quality: input.quality ?? "medium",
      voice: input.voice,
      language: input.language,
      knowledge_base: input.knowledge_base,
      knowledge_base_id: input.knowledge_base_id,
      version: "v2",
      video_encoding: "H264",
      source: "sdk",
      disable_idle_timeout: input.disable_idle_timeout ?? false,
      activity_idle_timeout: input.activity_idle_timeout,
    },
  })
  return unwrap(res)
}

export async function startHeygenStreamingSession(
  sessionId: string,
): Promise<void> {
  await request<unknown>("/v1/streaming.start", {
    method: "POST",
    body: { session_id: sessionId },
  })
}

export async function stopHeygenStreamingSession(
  sessionId: string,
): Promise<void> {
  await request<unknown>("/v1/streaming.stop", {
    method: "POST",
    body: { session_id: sessionId },
  })
}

export async function sendHeygenStreamingTask(input: {
  session_id: string
  text: string
  task_type?: "talk" | "repeat"
  task_mode?: "sync" | "async"
}): Promise<void> {
  await request<unknown>("/v1/streaming.task", {
    method: "POST",
    body: {
      session_id: input.session_id,
      text: input.text,
      task_type: input.task_type ?? "talk",
      task_mode: input.task_mode ?? "async",
    },
  })
}

export async function interruptHeygenStreamingSession(
  sessionId: string,
): Promise<void> {
  await request<unknown>("/v1/streaming.interrupt", {
    method: "POST",
    body: { session_id: sessionId },
  })
}

export async function keepAliveHeygenStreamingSession(
  sessionId: string,
): Promise<void> {
  await request<unknown>("/v1/streaming.keep_alive", {
    method: "POST",
    body: { session_id: sessionId },
  })
}

/**
 * Tell HeyGen to start transcribing the user's published mic audio
 * from the LiveKit room and feed it into the avatar's LLM. Without
 * this call the agent ignores the mic even after the track is
 * published.
 */
export async function startHeygenStreamingListening(
  sessionId: string,
): Promise<void> {
  await request<unknown>("/v1/streaming.start_listening", {
    method: "POST",
    body: { session_id: sessionId },
  })
}

export async function stopHeygenStreamingListening(
  sessionId: string,
): Promise<void> {
  await request<unknown>("/v1/streaming.stop_listening", {
    method: "POST",
    body: { session_id: sessionId },
  })
}

// ──────────────────────────────────────────────────────────────────────
// Interactive avatar knowledge bases
//
// Each KB pairs a system prompt + opening line with an LLM persona.
// Must be passed as `knowledge_base_id` to `/v1/streaming.new` or the
// avatar transcribes user speech but never answers.

export interface HeygenKnowledgeBase {
  id: string
  name: string
  opening?: string
  prompt?: string
}

export async function listHeygenKnowledgeBases(): Promise<HeygenKnowledgeBase[]> {
  const res = await request<{
    data?: { list?: HeygenKnowledgeBase[] } & Partial<HeygenKnowledgeBase[]>
  }>("/v1/streaming/knowledge_base/list", { method: "GET" })
  return res.data?.list ?? []
}

// ──────────────────────────────────────────────────────────────────────
// Interactive avatars (list)

export interface HeygenInteractiveAvatar {
  pose_id?: string
  pose_name?: string
  avatar_id?: string
  normal_preview?: string
  is_public?: boolean
  status?: string
  created_at?: number
  default_voice?: string
}

/** Interactive-capable avatars this tenant can use in streaming.new. */
export async function listHeygenInteractiveAvatars(): Promise<
  HeygenInteractiveAvatar[]
> {
  const res = await request<{ data?: HeygenInteractiveAvatar[] }>(
    "/v1/streaming/avatar.list",
    { method: "GET" },
  )
  return res.data ?? []
}

export interface ListHeygenVideosOptions {
  /** Page size, 1–100. Defaults to 10 upstream. */
  limit?: number
  /** Opaque cursor from a previous response's `next_token`. */
  token?: string
  folder_id?: string
  /** Substring filter on video title. */
  title?: string
  /**
   * Override the tenant used to look up the HeyGen integration credential
   * on the server. Useful for pages like `/community` that list videos
   * from the platform's main tenant regardless of the current user.
   */
  platform?: string
}

export interface HeygenVideoPage {
  data: HeygenVideoDetail[]
  has_more?: boolean
  next_token?: string | null
}

/**
 * List the tenant's HeyGen videos. Pair with `getHeygenVideoStatus` for
 * fresh details, though this endpoint already surfaces the full video
 * record for each entry so callers can render directly from the page.
 */
export async function listHeygenVideosPage(
  opts: ListHeygenVideosOptions = {},
): Promise<HeygenVideoPage> {
  const res = await request<HeygenVideoPage>("/v3/videos", {
    method: "GET",
    platform: opts.platform,
    query: {
      limit: opts.limit,
      token: opts.token,
      folder_id: opts.folder_id,
      title: opts.title,
    },
  })
  return {
    data: res.data ?? [],
    has_more: res.has_more,
    next_token: res.next_token ?? null,
  }
}

export async function getHeygenVideoStatus(
  videoId: string,
): Promise<HeygenVideoDetail> {
  const res = await request<
    { data?: HeygenVideoDetail } & Partial<HeygenVideoDetail>
  >(`/v3/videos/${encodeURIComponent(videoId)}`, { method: "GET" })
  return unwrap(res)
}
