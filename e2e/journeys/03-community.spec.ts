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

  test("search box debounces and re-issues the list request", async ({
    page,
  }) => {
    const titleQueries: string[] = [];
    await setupFakes(page, {
      heygenOverrides: {
        "v3/videos": async (route) => {
          const url = new URL(route.request().url());
          const q = url.searchParams.get("title") ?? "";
          titleQueries.push(q);
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              data: q
                ? []
                : [
                    {
                      id: "video-1",
                      title: "Sample Video",
                      status: "completed",
                      video_url: "https://example.com/video.mp4",
                      thumbnail_url: "https://example.com/thumb.png",
                      duration: 12,
                      created_at: 1700000000,
                    },
                  ],
              has_more: false,
              next_token: null,
            }),
          });
        },
      },
    });
    await visit(page, "/community");
    await expect(page.getByText("Sample Video").first()).toBeVisible();

    await page.getByPlaceholder(/search by title/i).fill("zzz");
    await expect(page.getByText(/no videos found/i)).toBeVisible({
      timeout: 10_000,
    });
    expect(titleQueries).toContain("zzz");
  });
});
