import { expect, test } from "@playwright/test";
import { setupFakes } from "../utils/heygen-mocks";
import { visit } from "../utils/visit";

test.describe("Create Voice", () => {
  test("renders the voice details form, sample dropzone, and disabled Create button", async ({
    page,
  }) => {
    await setupFakes(page);
    await visit(page, "/voices/create");

    await expect(
      page.getByRole("heading", { name: /create new voice/i }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByPlaceholder(/my custom voice/i)).toBeVisible();
    const createBtn = page.getByRole("button", { name: /^create voice$/i });
    await expect(createBtn).toBeVisible();
    await expect(createBtn).toBeDisabled();
  });
});
