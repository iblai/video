# videoAI E2E Coverage — User Journey Checklist

> Last updated: 2026-05-14 | 27 checkpoints (27 active, 0 deprecated) | 13 journeys | **100% covered** (28/28 specs passing in 1m 30s).

## The flake fix

Earlier runs were dominated by an SDK `<AuthProvider enableStorageSync>`
race: a few seconds after every page mount, the provider detected the
SSO SPA's cross-tab storage write and reloaded the page, yanking slow
assertions off their target route.

Fixed by:

- `providers/iblai-providers.tsx` reads `NEXT_PUBLIC_DISABLE_STORAGE_SYNC`
  and threads it into `<AuthProvider enableStorageSync={…}>`.
- `e2e/playwright.config.ts` sets `process.env.NEXT_PUBLIC_DISABLE_STORAGE_SYNC = "1"`
  before the dev server boots so the entire test run runs with the
  cross-tab refresh disabled.
- `e2e/utils/visit.ts` is now a single `page.goto` — no more race-survival
  bouncing.

Production still gets storage sync (the env var is unset there), so
multi-tab logout/login still propagates as before.

## Tenant alignment

`NEXT_PUBLIC_MAIN_TENANT_KEY` in `.env.local` must match the tenant the
SSO user belongs to. Otherwise `TenantProvider.saveCurrentTenant` redirects
to the SSO SPA and you get a bounce on top of any other flake.

## HeyGen integration credential

`setupFakes` now stubs the DM `integration-credential` probe so
`HeygenGuard` never gates the app on the SSO user's tenant. Individual
specs can override the route to test the missing-credential branch (see
journey 10 below).

## How This Works

Each **checkpoint** maps to a concrete user action or verification within
a spec file. Coverage = `covered_checkpoints / active_checkpoints * 100`.

When adding a new page or modifying an existing user flow:

1. Add checkpoints to the relevant journey below (or create a new journey)
2. Write Playwright tests for each checkpoint in `e2e/journeys/`
3. Mark the checkpoint `[x]` once the test is in the suite and passing
4. Mirror the change in `e2e/coverage.json`

---

## Journey 1: Home Redirect (1 checkpoint) — `journeys/01-home-redirect.spec.ts`

**Source files:** `app/page.tsx`, `lib/iblai/auth-utils.ts`

- [x] Authenticated user is redirected from `/` to `/ai-avatar/generate`

---

## Journey 2: Sidebar Navigation (7 checkpoints) — `journeys/02-sidebar-navigation.spec.ts`

**Source files:** `components/app-sidebar.tsx`

- [x] `/ai-avatar/generate` mounts without dev error overlay
- [x] `/ai-avatar/my` mounts without dev error overlay
- [x] `/scripts/add` mounts without dev error overlay
- [x] `/videos/generate` mounts without dev error overlay
- [x] `/videos/my` mounts without dev error overlay
- [x] `/videos/prompts` mounts without dev error overlay
- [x] `/community` mounts without dev error overlay

---

## Journey 3: Community (2 checkpoints) — `journeys/03-community.spec.ts`

**Source files:** `app/community/page.tsx`, `lib/heygen/rest.ts`

- [x] Renders search input + populates video grid from the mocked main tenant
- [x] Search box debounces and re-issues the list-videos request with `title=`

---

## Journey 4: Create Script (2 checkpoints) — `journeys/04-scripts.spec.ts`

**Source files:** `app/scripts/add/page.tsx`, `lib/heygen/rest.ts`, `lib/scripts/extract-text.ts`

- [x] Renders the editor, AI Script panel, and AI Help button on mount
- [x] Switches between Text / Audio / Files tabs

---

## Journey 5: Prompt Gallery (2 checkpoints) — `journeys/05-prompt-gallery.spec.ts`

**Source files:** `app/videos/prompts/page.tsx`, `lib/iblai/catalog.ts`

- [x] Empty state renders "Add Prompt" button + "no prompts yet" message + category tabs
- [x] Catalog results render as cards with title + description

---

## Journey 6: Video Clips (2 checkpoints) — `journeys/06-videos.spec.ts`

**Source files:** `app/videos/generate/page.tsx`, `app/videos/my/page.tsx`, `components/video-generator.tsx`

- [x] Generate page renders upload pane, voice selector, Generate button
- [x] My Video Clips page mounts without dev error overlay

---

## Journey 7: Create Voice (1 checkpoint) — `journeys/07-voices.spec.ts`

**Source files:** `app/voices/create/page.tsx`, `lib/heygen/rest.ts`

- [x] Renders the voice details form and a disabled Create Voice button before upload

---

## Journey 8: AI Avatars (2 checkpoints) — `journeys/08-ai-avatars.spec.ts`

**Source files:** `app/ai-avatar/generate/page.tsx`, `app/ai-avatar/my/page.tsx`

- [x] `/ai-avatar/generate` renders the upload + naming UI
- [x] `/ai-avatar/my` mounts the gallery shell

---

## Journey 9: Admin Gate (1 checkpoint) — `journeys/09-admin-gate.spec.ts`

**Source files:** `components/admin-guard.tsx`, `components/conditional-layout.tsx`

- [x] Non-admin sees the "Admin access required" message + Contact + Log out

---

## Journey 10: HeyGen Integration Gate (2 checkpoints) — `journeys/10-heygen-gate.spec.ts`

**Source files:** `components/heygen-guard.tsx`, `components/conditional-layout.tsx`

- [x] Empty credential list shows the "HeyGen integration required" message + Contact + Log out
- [x] Credential with an empty `value.key` also gates the app

---

## Journey 11: Interactive Avatars (1 checkpoint) — `journeys/11-interactive.spec.ts`

**Source files:** `app/ai-avatar/interactive/page.tsx`, `hooks/use-heygen-avatars.ts`

- [x] Renders the interactive avatars search input

---

## Journey 12: Video Watch (1 checkpoint) — `journeys/12-video-watch.spec.ts`

**Source files:** `app/video/watch/[id]/page.tsx`

- [x] Shared video URL renders the watch page shell

---

## Journey 13: Notifications + Account + Header (3 checkpoints) — `journeys/13-notifications-account.spec.ts`, `journeys/14-header.spec.ts`

**Source files:** `app/notifications/page.tsx`, `app/account/page.tsx`, `components/app-header.tsx`

- [x] Notifications page mounts with the heading
- [x] Account page mounts the SDK Account container without errors
- [x] Header renders the strip with at least one action button (profile/bell)

---

## Backlog

Add new checkpoints here as features land, then move them under the
relevant journey once a spec exists:

- [ ] Interactive avatar streaming session can be entered (`/ai-avatar/interactive/[id]`)
- [ ] Voice cloning happy path: upload audio → submit → catalog row created
- [ ] Video clip generation happy path: upload image → fill script → submit → row appears in My Video Clips
- [ ] AI Help dialog generates a script via OpenAI and inserts into the editor
