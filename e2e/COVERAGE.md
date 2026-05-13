# videoAI E2E Coverage — User Journey Checklist

> Last updated: 2026-05-12 | 17 checkpoints (17 active, 0 deprecated) | 8 journeys | **59% covered** (10/17 on the latest run)

## The flake situation

Every checkpoint has a spec written. The reason coverage isn't higher is the SDK's `<AuthProvider enableStorageSync>` in `providers/iblai-providers.tsx`. A few seconds after every page mount, it detects that the SSO SPA wrote to shared storage and refreshes the page — which routes the test through `login.iblai.app` → `/sso-login-complete` → `defaultRedirectPath = "/ai-avatar/generate"`. `e2e/utils/visit.ts` catches the first leave and re-navigates to the target URL, but the sync can fire a second time after re-navigation, mid-assertion, and yank the page away.

Which specific checkpoints fail varies run-to-run because the race depends on workers' relative timing. In the latest run, these 7 lost the race:

- `nav-04` — sidebar navigation to `/videos/generate`
- `community-02` — search debounce
- `scripts-02` — switching Text / Audio / Files tabs
- `prompts-01` — empty state (passed on the previous run)
- `videos-01` — Video Clip Generator upload + Generate button
- `voices-01` — Create Voice form (passed on the previous run)
- `ai-avatars-02` — `/ai-avatar/my` gallery shell

**The right fix** is an `enableStorageSync={false}` (or equivalent flag) the test env can pass through `IblaiProviders`. That's an app code change — flagged but not done yet. With it, every checkpoint should go green.

## Tenant alignment

`NEXT_PUBLIC_MAIN_TENANT_KEY` in `.env.local` must match the tenant the SSO user belongs to, otherwise `TenantProvider.saveCurrentTenant` calls `checkTenantMismatch()` → `redirectToAuthSpa(...)` and you get a second SSO bounce on top of the storage-sync race.

## How This Works

Each **checkpoint** maps to a concrete user action or verification within a spec file.
Coverage = `covered_checkpoints / active_checkpoints * 100`.

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
- [ ] `/videos/generate` mounts without dev error overlay — SDK storage-sync race
- [x] `/videos/my` mounts without dev error overlay
- [x] `/videos/prompts` mounts without dev error overlay
- [x] `/community` mounts without dev error overlay

---

## Journey 3: Community (2 checkpoints) — `journeys/03-community.spec.ts`

**Source files:** `app/community/page.tsx`, `lib/heygen/rest.ts`

- [x] Renders search input + populates video grid from the mocked main tenant
- [ ] Search box debounces and re-issues the list-videos request with `title=` — SDK storage-sync race after input fill

---

## Journey 4: Create Script (2 checkpoints) — `journeys/04-scripts.spec.ts`

**Source files:** `app/scripts/add/page.tsx`, `lib/heygen/rest.ts`, `lib/scripts/extract-text.ts`

- [x] Renders the editor, AI Script panel, and AI Help button on mount
- [ ] Switches between Text / Audio / Files tabs — SDK storage-sync race on tab click

---

## Journey 5: Prompt Gallery (2 checkpoints) — `journeys/05-prompt-gallery.spec.ts`

**Source files:** `app/videos/prompts/page.tsx`, `lib/iblai/catalog.ts`

- [ ] Empty state renders "Add Prompt" button + "no prompts yet" message + category tabs — flaky against the storage-sync race
- [x] Catalog results render as cards with title + description

---

## Journey 6: Video Clips (2 checkpoints) — `journeys/06-videos.spec.ts`

**Source files:** `app/videos/generate/page.tsx`, `app/videos/my/page.tsx`, `components/video-generator.tsx`

- [ ] Generate page renders upload pane, voice selector, Generate button — slowest assertions in the suite, deterministically caught by the storage-sync race
- [x] My Video Clips page mounts without dev error overlay

---

## Journey 7: Create Voice (1 checkpoint) — `journeys/07-voices.spec.ts`

**Source files:** `app/voices/create/page.tsx`, `lib/heygen/rest.ts`

- [ ] Renders the voice details form and a disabled Create Voice button before upload — flaky against the storage-sync race

---

## Journey 8: AI Avatars (2 checkpoints) — `journeys/08-ai-avatars.spec.ts`

**Source files:** `app/ai-avatar/generate/page.tsx`, `app/ai-avatar/my/page.tsx`

- [x] `/ai-avatar/generate` renders the upload + naming UI
- [ ] `/ai-avatar/my` mounts the gallery shell — SDK storage-sync race

---

## Backlog

Add new checkpoints here as features land, then move them under the relevant journey once a spec exists:

- [ ] Interactive avatar streaming session can be entered (`/ai-avatar/interactive/[id]`)
- [ ] Voice cloning happy path: upload audio → submit → catalog row created
- [ ] Video clip generation happy path: upload image → fill script → submit → row appears in My Video Clips
- [ ] AI Help dialog generates a script via OpenAI and inserts into the editor
- [ ] Notifications dropdown opens from the header
- [ ] Video Watch page renders the shared video player
