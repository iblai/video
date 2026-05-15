import { expect, test } from "@playwright/test";
import { setupFakes } from "../utils/heygen-mocks";
import { visit } from "../utils/visit";

test.describe("Community", () => {
  test("renders search input and the video grid from the mocked main tenant", async ({
    page,
  }) => {
    await setupFakes(page);
    await visit(page, "/community");

    await expect(
      page.getByRole("heading", { name: /community/i }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByPlaceholder(/search by title/i)).toBeVisible();
    await expect(page.getByText("Sample Video").first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("search box filters the grid in-memory after the debounce", async ({
    page,
  }) => {
    await setupFakes(page);
    await visit(page, "/community");
    // TenantProvider can hold the LOADING fallback for a couple seconds
    // while it resolves getUserTenants — give the initial grid render
    // the same headroom community-01 does.
    await expect(page.getByText("Sample Video").first()).toBeVisible({
      timeout: 15_000,
    });

    await page.getByPlaceholder(/search by title/i).fill("zzz");
    // The page filters in-memory off the public-video resources it
    // already pulled from the catalog — typing past the 400ms debounce
    // should drop the only seeded clip and surface the empty-state.
    await expect(page.getByText(/no videos found/i)).toBeVisible({
      timeout: 10_000,
    });
  });
});
