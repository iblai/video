import { expect, test } from "@playwright/test";
import { setupFakes } from "../utils/heygen-mocks";
import { visit } from "../utils/visit";

test.describe("Prompt Gallery", () => {
  test("renders the Add Prompt button, empty state, and category tabs", async ({
    page,
  }) => {
    await setupFakes(page);
    await visit(page, "/videos/prompts");

    await expect(
      page.getByRole("heading", { name: /prompt gallery/i }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByRole("button", { name: /add prompt/i }),
    ).toBeVisible();
    await expect(page.getByText(/no prompts yet/i)).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByRole("button", { name: /^all$/i })).toBeVisible();
  });

  test("renders catalog prompts when the catalog returns results", async ({
    page,
  }) => {
    await page.route("**/api/catalog/resources/**", async (route) => {
      const method = route.request().method();
      if (method === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            results: [
              {
                item_id: "a",
                id: 1,
                name: "Welcome Prompt",
                url: "",
                resource_type: "video_prompt",
                data: {
                  title: "Welcome Prompt",
                  category: "Instructional Designer",
                  description: "Greet students warmly and outline today's lesson.",
                },
                image: "",
                description: "",
              },
            ],
          }),
        });
      }
      return route.fulfill({ status: 204, body: "" });
    });
    await visit(page, "/videos/prompts");
    await expect(page.getByText("Welcome Prompt").first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByText(/greet students warmly/i).first(),
    ).toBeVisible();
  });
});
