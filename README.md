<div align="center">

<a href="https://ibl.ai"><img src="https://ibl.ai/images/iblai-logo.png" alt="ibl.ai" width="300"></a>

# videoAI

An AI video studio for generating avatar videos, cloning voices, and authoring scripts — built on the ibl.ai platform with HeyGen and OpenAI under the hood.

[![Next.js](https://img.shields.io/badge/Next.js-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Claude Code](https://img.shields.io/badge/Claude_Code-CC785C?logoColor=white)](https://claude.ai)

</div>

---

## What is videoAI

videoAI is an end-to-end video generation workspace. Pick or create an avatar, clone a voice, write or transcribe a script, and generate a finished video — all from one shell powered by the [@iblai/iblai-js](https://www.npmjs.com/package/@iblai/iblai-js) SDK and connected to `iblai.app`. The HeyGen API is never called directly from the browser: a tenant-scoped server proxy resolves the integration credential through ibl.ai's `ai-account` service and forwards each request upstream.

| Feature | Description |
|---------|-------------|
| **Video Clip Generation** | Image-to-video via HeyGen `/v3/videos` — upload a reference image, pick a voice, write a script, and add an optional motion prompt |
| **Avatar Videos** | Generate full avatar videos from script + voice + avatar via HeyGen `/v2/video/generate` |
| **AI Avatars** | Browse the public HeyGen library, manage private avatars, generate photo avatars (`/v2/photo_avatar/*`), and create digital twins from video uploads (`/v3/avatars`) |
| **Interactive Avatars** | Real-time streaming avatars via HeyGen `/v1/streaming.*` + LiveKit — the browser joins LiveKit directly after the proxy creates the session |
| **Voice Cloning** | Clone any voice from an audio sample via HeyGen `/v3/voices/clone`; cloned voices are registered as `heygen_private_voice` catalog resources so every user on the tenant can find them |
| **Voice Library** | Paginated voice picker that merges tenant-curated private voices with HeyGen's public library, deduped by voice id |
| **Create Script** | Rich-text editor with three input modes: type, transcribe audio (OpenAI Whisper), or extract text from DOCX / PDF / PPTX / TXT — plus AI Help (OpenAI `gpt-4o-mini`) and TTS preview via HeyGen `/v3/voices/speech` |
| **Prompt Gallery** | Tenant-shared prompt library backed by catalog `video_prompt` resources — create, edit (delete + recreate), delete, and copy prompts |
| **Community** | Platform-wide video grid pulled from the `main` tenant's HeyGen library, with title search and cursor-based pagination |
| **My Videos** | Per-user gallery of generated videos with live status polling and player modal |
| **Notifications** | Header dropdown via the ibl.ai SDK's `<NotificationDropdown>` |
| **SSO Authentication** | Login via iblai.app — no tokens to manage |

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm (fall back to npm only if unavailable)
- An ibl.ai platform (`iblai.app`) login.
- A HeyGen integration credential registered on your tenant via the ibl.ai `ai-account` service
- An OpenAI API key for script generation, prompt enhancement, and audio transcription

### Install & Run

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). You'll be redirected to `https://login.iblai.app` for SSO; on return, your tenant + DM token are resolved from the SDK and every HeyGen call is proxied through `/api/heygen/*` using the credential registered for your tenant.

### Build

```bash
pnpm build
pnpm start
```

### Tests

Vitest covers the pure libraries (catalog, tenant, config, HeyGen REST client, voice loader, document extractor):

```bash
pnpm test                # one-shot
pnpm test:watch          # rerun on file changes
pnpm test:coverage       # html + console v8 report under coverage/
```

Playwright covers the user journeys via real SSO. Copy `e2e/.env.development.example` to `e2e/.env.development` (gitignored) and fill in your iblai login:

```
PLAYWRIGHT_USERNAME=you@example.com
PLAYWRIGHT_PASSWORD=…
```

Then:

```bash
pnpm test:e2e            # spins up `next dev` on port 3100, runs auth.setup.ts once, then the journeys
```

`e2e/auth.setup.ts` drives the SSO round-trip and writes the resulting `storageState` to `e2e/playwright/.auth/user.json`; every journey reuses it via the `chromium` project's `dependencies: ["setup"]`. HeyGen + ibl.ai catalog calls are stubbed per-journey by `e2e/utils/heygen-mocks.ts` for predictable rendering. Journey coverage lives in `e2e/COVERAGE.md` + `e2e/coverage.json`.

### Environment variables

`.env.local` configures the ibl.ai endpoints and the OpenAI key. The HeyGen API key is never read by the browser — it's resolved server-side per request.

```bash
# ibl.ai platform — defaults work out of the box
NEXT_PUBLIC_API_BASE_URL=https://api.iblai.app
NEXT_PUBLIC_AUTH_URL=https://login.iblai.app
NEXT_PUBLIC_PLATFORM_BASE_DOMAIN=iblai.app

# Optional: pin a specific tenant for `resolveAppTenant()`
NEXT_PUBLIC_MAIN_TENANT_KEY=

# OpenAI — used client-side for Whisper, prompt enhance, and AI Help
NEXT_PUBLIC_OPENAI_API_KEY=sk-...
```

## Project Structure

```
app/
├── layout.tsx                         # Root layout — title "videoAI"
├── page.tsx                           # Dashboard landing
├── login/                             # SSO entry
├── sso-login-complete/                # SSO callback (SDK <SsoLogin>)
├── ai-avatar/
│   ├── public/                        # Browse HeyGen public avatar library
│   ├── my/                            # Tenant-shared private avatars
│   ├── generate/                      # Photo / digital-twin avatar creation
│   └── interactive/[id]/              # Real-time streaming avatar session
├── voices/create/                     # Clone a voice from an audio sample
├── scripts/add/                       # Create Script (text, audio, files) + TTS preview
├── videos/
│   ├── generate/                      # Image-to-video clip generator
│   ├── my/                            # Per-user gallery with live status polling
│   ├── prompts/                       # Prompt gallery (catalog-backed)
│   └── public-video-clips/            # Curated public clip browser
├── community/                         # Platform-wide video grid (main tenant)
├── video/watch/[id]/                  # Public/shareable watch page
├── session/[avatar]/[sessionId]/      # Interactive avatar session route
├── notifications/                     # Notification center
├── account/                           # Account settings
└── api/heygen/[...path]/route.ts      # HeyGen REST proxy (resolves tenant credential)
components/
├── app-sidebar.tsx                    # Left nav + tenant header
├── app-header.tsx                     # Top bar — notifications + profile
├── video-generator.tsx                # Clip generator UI (image + script + voice + motion prompt)
├── dashboard.tsx                      # Landing page widgets
└── modals/                            # Player, share, voice picker, avatar picker, ...
lib/heygen/
└── rest.ts                            # Browser HeyGen client (every call goes via /api/heygen)
lib/iblai/
├── config.ts                          # NEXT_PUBLIC_* env reader
├── tenant.ts                          # Tenant resolution (env → app_tenant → SDK)
├── catalog.ts                         # Catalog resources (private avatar / video / voice / video_prompt)
├── ai-proxy.ts                        # ibl.ai AI proxy helpers
├── auth-utils.ts                      # redirectToAuthSpa, logout
└── storage-service.ts                 # LocalStorageService for the SDK data layer
lib/scripts/
└── extract-text.ts                    # Lazy DOCX / PDF / PPTX / TXT extractors
hooks/
└── use-heygen-voices.ts               # Paginated voice loader (catalog + HeyGen, deduped)
providers/                             # Redux + IblaiProviders + Drawer + Toaster
```

## Built With

- [Next.js](https://nextjs.org) — App Router
- [@iblai/iblai-js](https://www.npmjs.com/package/@iblai/iblai-js) — SDK for auth, UI components, and data
- [HeyGen](https://developers.heygen.com) — avatars, voices, video generation, interactive streaming
- [OpenAI](https://platform.openai.com) — Whisper transcription, `gpt-4o-mini` for prompt enhancement and AI Help
- [LiveKit](https://livekit.io) — WebRTC transport for interactive avatar sessions
- [Tailwind CSS](https://tailwindcss.com) — utility-first styling with the `videoai-*` design tokens
- [shadcn/ui](https://ui.shadcn.com) — accessible UI primitives
- `https://iblai.app` — production backend for auth, integration credentials, and the resource catalog

## Contributing

### Setup

1. Fork the repo and clone it
2. Install dependencies: `pnpm install`
3. Start the dev server: `pnpm dev`

### Development Workflow

1. Create a branch from `main`: `git checkout -b feat/my-feature`
2. Make your changes
3. Run `pnpm build` and `pnpm test` to verify
4. Commit and push your branch
5. Open a pull request against `main`

### Guidelines

- **Never call HeyGen directly from the browser** — every request must go through `/api/heygen/*` so the API key stays on the server
- **Use ibl.ai SDK components first** — do not build custom components when an SDK equivalent exists
- **Use shadcn/ui for custom UI** — install via `npx shadcn@latest add <component>`, not raw HTML or third-party libraries
- **Use SDK design tokens** — reference CSS variables like `var(--primary-color)`, `var(--border-color)`, `var(--text-secondary)` instead of hardcoded colors
- **Register shared resources in the catalog** — cloned voices, photo avatars, generated videos, and prompts are all platform-wide via `lib/iblai/catalog.ts`
- **Use `pnpm`** as the package manager and fallback to `bun` or `npm` if `pnpm` is not available.

## Resources

- [ibl.ai Documentation](https://docs.ibl.ai)
- [HeyGen API Reference](https://developers.heygen.com/reference)
- [iblai-app-cli](https://github.com/iblai/iblai-app-cli) — CLI for scaffolding ibl.ai apps
- [@iblai/mcp](https://www.npmjs.com/package/@iblai/mcp) — MCP server for AI-assisted development
- [Vibe](https://github.com/iblai/vibe) — developer toolkit for building with ibl.ai

---

<sub>Built with <a href="https://github.com/iblai/vibe">ibl.ai Vibe</a></sub>
