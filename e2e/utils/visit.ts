import type { Page } from "@playwright/test";

/**
 * Navigate to `route` and survive the SDK's <AuthProvider enableStorageSync>
 * "cookie sync detected — refreshing" cycle. When that fires (a few seconds
 * after first mount), the page bounces through login.iblai.app + SSO + the
 * SsoLogin default redirect (`/ai-avatar/generate`) — yanking journey tests
 * off their intended URL mid-assertion.
 *
 * Strategy: goto target, wait briefly to see if the sync triggers a leave;
 * if it does, wait for the SSO bounce to land back at the app, then re-goto
 * the target. Storage is now stable for assertions.
 */
export async function visit(page: Page, route: string): Promise<void> {
  await page.goto(route, { waitUntil: "domcontentloaded" });

  // Race the auth-sync redirect. Either we leave the app origin within ~6s
  // (sync fired), or we stayed put (no sync this session).
  const origin = new URL(page.url()).origin;
  try {
    await page.waitForURL((u) => u.origin !== origin, { timeout: 6_000 });
  } catch {
    return; // never redirected, we're good
  }

  // Sync redirected us out. Wait for it to bounce back to our origin.
  await page.waitForURL((u) => u.origin === origin, { timeout: 60_000 });
  // The SsoLogin component lands on /ai-avatar/generate by default; we need
  // the route the caller actually wanted.
  await page.goto(route, { waitUntil: "domcontentloaded" });
}
