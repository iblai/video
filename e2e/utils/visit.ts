import type { Page } from "@playwright/test";

const STORAGE_SYNC_FLAG_KEY = "__disable_storage_sync";

const applied = new WeakSet<Page>();

/**
 * Navigate to `route`. Sets the `__disable_storage_sync` flag in
 * localStorage via `addInitScript` so `IblaiProviders` skips the SDK's
 * cross-tab refresh — that race used to yank slow assertions off-page.
 * Idempotent per page; safe to call from every spec regardless of which
 * dev server we're pointed at.
 */
export async function visit(page: Page, route: string): Promise<void> {
  if (!applied.has(page)) {
    applied.add(page);
    await page.addInitScript((key) => {
      try {
        localStorage.setItem(key, "1");
      } catch {
        /* ignore */
      }
    }, STORAGE_SYNC_FLAG_KEY);
  }
  await page.goto(route, { waitUntil: "domcontentloaded" });
}
