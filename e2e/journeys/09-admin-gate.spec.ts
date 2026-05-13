import { expect, test } from "@playwright/test";
import { mockUserTenants, setupFakes } from "../utils/heygen-mocks";
import { visit } from "../utils/visit";

/**
 * Demote the user to non-admin in two places:
 *
 * - `tenants` in localStorage (via `addInitScript` — `useIsAdmin` reads
 *   it directly on mount).
 * - The upstream `/users/manage/platform/` response, which the
 *   TenantProvider re-fetches and writes back into localStorage. An
 *   empty list keeps `useIsAdmin` at false after that round-trip.
 *
 * With an empty tenants list `useIsAdmin` returns `false` for any
 * tenant key, so AdminGuard renders the gate.
 */
async function demoteToStudent(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("tenants", "[]");
    } catch {
      /* ignore */
    }
  });
  await mockUserTenants(page, []);
}

test.describe("Admin gate", () => {
  test("non-admin sees the admin-access-required message instead of the app", async ({
    page,
  }) => {
    await setupFakes(page);
    await demoteToStudent(page);
    await visit(page, "/ai-avatar/generate");

    await expect(
      page.getByRole("heading", { name: /admin access required/i }),
    ).toBeVisible({ timeout: 15_000 });

    const contact = page.getByRole("link", { name: /contact ibl\.ai/i });
    await expect(contact).toBeVisible();
    await expect(contact).toHaveAttribute("href", "https://ibl.ai/contact");

    // The app shell should not have rendered.
    await expect(
      page.getByRole("heading", { name: /generate ai avatar/i }),
    ).toHaveCount(0);
  });
});
