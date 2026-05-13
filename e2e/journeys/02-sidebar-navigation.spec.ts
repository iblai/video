import { expect, test } from "@playwright/test";
import { setupFakes } from "../utils/heygen-mocks";
import { visit } from "../utils/visit";

const NAV_TARGETS = [
  { href: "/ai-avatar/generate", heading: /generate ai avatar/i },
  { href: "/ai-avatar/my", heading: /my ai avatars/i },
  { href: "/scripts/add", heading: /create script/i },
  { href: "/videos/generate", heading: /generate video clip/i },
  { href: "/videos/my", heading: /my video clips/i },
  { href: "/videos/prompts", heading: /prompt gallery/i },
  { href: "/community", heading: /community/i },
];

test.describe("Sidebar navigation", () => {
  for (const { href, heading } of NAV_TARGETS) {
    test(`navigates to ${href}`, async ({ page }) => {
      await setupFakes(page);
      await visit(page, href);
      await expect(
        page.getByRole("heading", { name: heading }),
      ).toBeVisible({ timeout: 15_000 });
      // Next 16's `<nextjs-portal>` hosts the always-on Dev Tools button,
      // so we can't gate on its presence. Look for the actual error
      // overlay marker instead — only present when Next surfaces a
      // build-time / runtime error.
      await expect(
        page.locator("nextjs-portal [data-nextjs-toast-errors-parent]"),
      ).toHaveCount(0);
    });
  }
});
