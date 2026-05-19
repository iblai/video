<div align="center">

<a href="https://ibl.ai"><img src="https://ibl.ai/images/iblai-logo.png" alt="ibl.ai" width="300"></a>

# videoAI

An AI video studio for generating avatar videos, cloning voices, and authoring scripts.

[![Next.js](https://img.shields.io/badge/Next.js-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Claude Code](https://img.shields.io/badge/Claude_Code-CC785C?logoColor=white)](https://claude.ai)
[![Desktop & Mobile](https://img.shields.io/badge/Desktop_%26_Mobile-supported-blue)](https://github.com/iblai/vibe/blob/main/skills/iblai-ops-build/SKILL.md)

</div>

---

## What is videoAI



Watch the video demo here:

[![AI Avatar generation](https://raw.githubusercontent.com/iblai/vidai/main/docs/screenshots/avatar-generation.png)](https://drive.google.com/file/d/1ap5Rqxq34gBi9kOncHQyupHeyEn5TGFM/view?usp=sharing)

More screenshots:

![Video clip generator](https://raw.githubusercontent.com/iblai/vidai/main/docs/screenshots/video-clip-generation.png)

![Script editor with AI Help](https://raw.githubusercontent.com/iblai/vidai/main/docs/screenshots/script-generation.png)




videoAI is an end-to-end video generation workspace. Pick or create an avatar, clone a voice, write or transcribe a script, and generate a finished video — all from one web app powered by the [@iblai/iblai-js](https://www.npmjs.com/package/@iblai/iblai-js) SDK and connected to `iblai.app`. The HeyGen and OpenAI API keys are never called directly from the browser: tenant-scoped server proxies resolve the integration credentials through ibl.ai API and forward each request upstream.

| Feature | Description |
|---------|-------------|
| **Video Clip Generation** | Image-to-video via HeyGen `/v3/videos` — upload a reference image, pick a voice, write a script, and add an optional motion prompt |
| **Avatar Videos** | Generate full avatar videos from script + voice + avatar via HeyGen `/v2/video/generate` |
| **Interactive Avatars** | Real-time streaming avatars via HeyGen `/v1/streaming.*` + LiveKit — the browser joins LiveKit directly after the proxy creates the session |
| **Voice Cloning** | Clone any voice from an audio sample via HeyGen `/v3/voices/clone`; cloned voices are registered as `heygen_private_voice` catalog resources so every user on the tenant can find them |
| **Voice Library** | Paginated voice picker that merges tenant-curated private voices with HeyGen's public library, deduped by voice id |
| **Create Script** | Rich-text editor with three input modes: type, transcribe audio (OpenAI Whisper), or extract text from DOCX / PDF / PPTX / TXT — plus AI Help (OpenAI `gpt-4o-mini`) and TTS preview via HeyGen `/v3/voices/speech` |
| **Prompt Gallery** | Tenant-shared prompt library backed by catalog `video_prompt` resources — create, edit (delete + recreate), delete, and copy prompts |
| **Community** | Platform-wide video grid pulled from the `main` tenant's HeyGen library, with title search and cursor-based pagination |
| **My Videos** | Per-user gallery of generated videos with live status polling and player modal |


## Audience

videoAI is for platform admins who've added a HeyGen API key to their ibl.ai settings. Non-admins land on a "Platform admin required" screen, and tenants without a `heygen` integration credential see a setup gate until one is registered.


## Quick Start

### Prerequisites

- Node.js 18+
- pnpm (use `npm` only if `pnpm` is unavailable)
- An ibl.ai login
- A HeyGen integration credential registered on your tenant via the ibl.ai `ai-account` service (the app gates itself with a "HeyGen integration required" screen when this is missing)
- An OpenAI API key, exported as `OPENAI_API_KEY` server-side (used by the `/api/openai/*` proxy for Whisper, AI Help, and motion-prompt enhancement)
- The `iblai` CLI — install from source (see below)

### Configure HeyGen key
Create an integration credential object on one of ibl.ai's apps, name it `"heygen"` and add your HeyGen API key.

### Install the `iblai` CLI

The CLI is installed from source via `make`. `clone + make install` is the supported install path.

**macOS / Linux** (Python 3.11+, pip, git, make):

```bash
git clone https://github.com/iblai/iblai-app-cli.git
cd iblai-app-cli
make -C .iblai install
cd -   # back to your project
```

If `iblai` isn't found afterwards, add `~/.local/bin` to your `PATH`:

```bash
export PATH="$HOME/.local/bin:$PATH"   # add to ~/.bashrc or ~/.zshrc to persist
```

**Windows** (Python 3.11+, pip, git):

```powershell
git clone https://github.com/iblai/iblai-app-cli.git
cd iblai-app-cli
pip install -e .iblai/
cd -
```

If `iblai` isn't found, ensure Python Scripts is on `PATH` (typically `%APPDATA%\Python\Python311\Scripts\`).

Verify the install:

```bash
iblai --version
```

### Install & Run

```bash
cp .env.example .env.local 
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). You'll be redirected to `https://login.iblai.app` for SSO and you will return to the `videoAI` app after auth.

`.env.local` is populated with the iblai.app endpoints — no manual platform credentials are needed up front.

### Build

```bash
pnpm build
pnpm start
```

### Native builds (iOS, Android, macOS, Linux, Surface)

Wrap videoAI in a native shell with [Tauri v2](https://tauri.app) using the
`iblai builds` family of commands (full guide:
[`/iblai-ops-build`](https://github.com/iblai/vibe/blob/main/skills/iblai-ops-build/SKILL.md)).
All platforms share a single static `next build` export — the CLI runs the
frontend build automatically before starting the Tauri dev server, and the
WebView loads the same `out/` bundle. **Stop `pnpm dev` (and any other
process on port 3000) before running a dev build.**

#### One-time setup

```bash
iblai add builds                    # Add Tauri support to the project
pnpm install
iblai builds iconography logo.png   # Generate per-platform app icons
```

You'll also need [Rust via rustup](https://rustup.rs).

For mobile SSO, set `TAURI_CUSTOM_SCHEME=videoai` in `iblai.env` so the auth
SPA redirects via a custom URI scheme (mobile WebViews can't return from
an `https://` redirect to a native app).

#### iOS


Requires macOS + Xcode + Xcode Command Line Tools.

```bash
rustup target add aarch64-apple-ios aarch64-apple-ios-sim
iblai builds ios init                          # one-time
iblai builds device                            # list simulators
iblai builds ios dev "iPhone 16 Pro Max"       # run on simulator
iblai builds ios dev --device                  # run on a connected iPhone
iblai builds ios build                         # produce .ipa
iblai builds ci-workflow --ios                 # generate App Store CI
```

#### Android


Requires Android Studio with the Android SDK + NDK installed.

```bash
rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
iblai builds android init                      # one-time
iblai builds device                            # list emulators
iblai builds android dev "Pixel_9"             # run on emulator
iblai builds android dev --device              # run on a connected device
iblai builds android build                     # produce APK
iblai builds ci-workflow --android             # generate Play Store CI
```

#### macOS desktop


Requires `xcode-select --install`.

```bash
iblai builds dev                               # run as a desktop app
iblai builds build                             # produce .dmg / .app
iblai builds ci-workflow --mac                 # generate macOS CI
```

#### Linux desktop

System deps (Debian/Ubuntu):

```bash
sudo apt install libwebkit2gtk-4.1-dev build-essential libssl-dev \
  libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
```

```bash
iblai builds dev                               # dev shell
iblai builds build                             # produce .deb / .AppImage
iblai builds ci-workflow --linux               # generate Linux CI
```

#### Surface (Windows tablet / desktop)

Requires Visual Studio Build Tools (C++ workload) and WebView2 (bundled
with Windows 11).

```bash
iblai builds dev                               # dev shell
iblai builds build                             # produce .msi / .exe
iblai builds ci-workflow --windows             # generate Windows CI
```

#### Generate every CI workflow at once

```bash
iblai builds ci-workflow --all
```

### Tests

Vitest covers the libraries, hooks, providers, components, modals, and API route handlers:

```bash
pnpm test                # one-shot
pnpm test:watch          # rerun on file changes
pnpm test:coverage       # html + console v8 report under coverage/
```

Playwright covers user journeys via real SSO. Copy `e2e/.env.development.example` to `e2e/.env.development` (gitignored) and fill in your iblai login:

```
PLAYWRIGHT_USERNAME=you@example.com
PLAYWRIGHT_PASSWORD=…
```

Then:

```bash
pnpm test:e2e            # spins up `next dev` on port 3100, runs auth.setup.ts once, then the journeys
```


### Environment variables

`.env.local` configures the ibl.ai endpoints and the OpenAI key. The HeyGen API key is never read by the browser — it's resolved server-side per request via the proxy.

```bash
# ibl.ai platform — defaults work out of the box
NEXT_PUBLIC_API_BASE_URL=https://api.iblai.app
NEXT_PUBLIC_AUTH_URL=https://login.iblai.app
NEXT_PUBLIC_PLATFORM_BASE_DOMAIN=iblai.app

# OpenAI — server-only. The `/api/openai/*` proxy reads this and adds
# `Authorization: Bearer` before forwarding. Do NOT use the
# `NEXT_PUBLIC_` prefix — that would inline the key into the browser bundle.
OPENAI_API_KEY=sk-...

# Optional: disable the SDK's cross-tab refresh in the dev server (also
# settable per-page via localStorage.__disable_storage_sync = "1")
NEXT_PUBLIC_DISABLE_STORAGE_SYNC=
```

### Deploy to Vercel


**Setup:** generate a Vercel token at [https://vercel.com/account/tokens](https://vercel.com/account/tokens) and add it to `iblai.env`:

```bash
echo 'VERCEL_TOKEN=<token>' >> iblai.env
```

And then deploy:

```bash
iblai deploy vercel
```

The CLI auto-detects the deploy mode from `next.config.mjs`. videoAI is a server-rendered Next.js app (App Router with API routes for the HeyGen and OpenAI proxies), so the CLI will:

- deploy the repo root to Vercel for a remote build,
- disable Vercel authentication / password protection,
- upload env vars from `.env.local` to production + preview (`NEXT_PUBLIC_*` as `plain`, the rest including `OPENAI_API_KEY` as `encrypted`; reserved keys and `your-…` placeholders are skipped),
- rerun the deploy with `--force` + `VERCEL_FORCE_NO_BUILD_CACHE=1` whenever env vars changed so the new `NEXT_PUBLIC_*` values are re-inlined into the client bundle.

Override detection with `--mode static` or `--mode server` when needed. Full guide: [`/iblai-ops-deploy`](https://github.com/iblai/vibe/blob/main/skills/iblai-ops-deploy/SKILL.md).


> **Tip:** You can change the vercel domain name by clicking on the three-dot button on your Vercel project on [`vercel.com`](https://vercel.com) and select "Manage Domains".

### Releasing

Releases are automated via [`release-it`](https://github.com/release-it/release-it)
+ GitHub Actions. Every push to `main` triggers `pnpm release --ci` via GitHub Actions, and release-it bumps the version and cuts a GitHub Release. 

To release locally:

```bash
pnpm release            # interactive prompts for version bump
pnpm release --ci       # non-interactive (used by CI)
```

## Project Structure

```
app/
├── layout.tsx                         # Root layout — title "videoAI"
├── page.tsx                           # Home redirect (auth check → /ai-avatar/generate)
├── login/                             # SSO entry
├── sso-login-complete/                # SSO callback (SDK <SsoLogin>)
├── ai-avatar/
│   ├── my/                            # Tenant-shared private avatars
│   ├── generate/                      # Photo / digital-twin avatar creation
│   ├── interactive/                   # Interactive avatars list
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
├── account/                           # Account settings (SDK <Account>)
└── api/
    ├── heygen/[...path]/route.ts      # HeyGen REST proxy (resolves tenant credential server-side)
    └── openai/[...path]/route.ts      # OpenAI proxy (uses OPENAI_API_KEY, never the browser)
components/
├── admin-guard.tsx                    # Whole-app admin gate
├── heygen-guard.tsx                   # Probes /integration-credential?name=heygen — gates on missing key
├── conditional-layout.tsx             # Auth shell vs. authed shell switch
├── app-sidebar.tsx                    # Left nav
├── app-header.tsx                     # Top bar — notifications + profile (shown on gate screens too)
├── video-generator.tsx                # Clip generator UI (image + script + voice + motion prompt)
├── iblai/                             # SDK wrappers (profile dropdown, notification bell)
└── modals/                            # Player, share, voice picker, avatar picker, ...
lib/heygen/
└── rest.ts                            # Browser HeyGen client (every call goes via /api/heygen)
lib/iblai/
├── config.ts                          # NEXT_PUBLIC_* env reader
├── tenant.ts                          # Tenant resolution from localStorage `tenant`
├── catalog.ts                         # Catalog resources (private avatar / video / voice / video_prompt)
├── ai-proxy.ts                        # ibl.ai AI proxy helpers
├── auth-utils.ts                      # redirectToAuthSpa, logout, handleTenantSwitch
└── storage-service.ts                 # LocalStorageService for the SDK data layer
lib/openai/
└── proxy.ts                           # Browser helper for /api/openai/* (no key, just DM token + tenant)
lib/scripts/
└── extract-text.ts                    # Lazy DOCX / PDF / PPTX / TXT extractors
hooks/
├── use-heygen-voices.ts               # Paginated voice loader (catalog + HeyGen, deduped)
├── use-heygen-avatars.ts              # Private avatar loader (catalog + HeyGen)
├── use-heygen-streaming.ts            # LiveKit + HeyGen streaming session hook
└── use-is-admin.ts                    # Reads tenants[].is_admin for the current tenant
providers/
└── iblai-providers.tsx                # Redux + AuthProvider + TenantProvider
```

## Built With

- [Next.js](https://nextjs.org) — App Router
- [@iblai/iblai-js](https://www.npmjs.com/package/@iblai/iblai-js) — SDK for auth, UI components, and data
- [HeyGen](https://developers.heygen.com) — avatars, voices, video generation, interactive streaming
- [OpenAI](https://platform.openai.com) — Whisper transcription, `gpt-4o-mini` for prompt enhancement and AI Help
- [LiveKit](https://livekit.io) — WebRTC transport for interactive avatar sessions
- [Tailwind CSS](https://tailwindcss.com) — utility-first styling with the `videoai-*` design tokens
- [shadcn/ui](https://ui.shadcn.com) — accessible UI primitives
- `iblai.app` — production backend for auth, integration credentials, AI agents, billing, and the resource catalog

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

- **Never call HeyGen or OpenAI directly from the browser** — every request must go through `/api/heygen/*` or `/api/openai/*` so the API keys stay on the server
- **Use ibl.ai SDK components first** — do not build custom components when an SDK equivalent exists
- **Use shadcn/ui for custom UI** — install via `npx shadcn@latest add <component>`, not raw HTML or third-party libraries
- **Do not override SDK styles** — SDK components ship with their own styling
- **Use SDK design tokens** — reference CSS variables like `var(--primary-color)`, `var(--border-color)`, `var(--text-secondary)` instead of hardcoded colors
- **Register shared resources in the catalog** — cloned voices, photo avatars, generated videos, and prompts are all platform-wide via `lib/iblai/catalog.ts`. Always include `username` on POSTs — the DM endpoint rejects requests without it
- **Use `pnpm`** as the package manager

### Adding Features

Use the iblai CLI and/or Claude Code skills to add new features:

```bash
iblai add chat           # AI chat widget
iblai add invite         # Invite dialogs
...
```

## Resources

- [ibl.ai Documentation](https://docs.ibl.ai)
- [HeyGen API Reference](https://developers.heygen.com/reference)
- [iblai-app-cli](https://github.com/iblai/iblai-app-cli) — CLI for scaffolding ibl.ai apps
- [@iblai/mcp](https://www.npmjs.com/package/@iblai/mcp) — MCP server for AI-assisted development
- [Vibe](https://github.com/iblai/vibe) — developer toolkit for building with ibl.ai

---

<sub>Built with <a href="https://github.com/iblai/vibe">ibl.ai Vibe</a></sub>
