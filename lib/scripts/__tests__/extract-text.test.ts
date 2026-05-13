import { describe, expect, it } from "vitest";
import { extractTextFromFile } from "@/lib/scripts/extract-text";

describe("extractTextFromFile", () => {
  it("reads .txt files via File.text()", async () => {
    const file = new File(["hello\nworld"], "notes.txt", {
      type: "text/plain",
    });
    expect(await extractTextFromFile(file)).toBe("hello\nworld");
  });

  it("rejects unsupported file extensions", async () => {
    const file = new File(["binary"], "image.png", { type: "image/png" });
    await expect(extractTextFromFile(file)).rejects.toThrow(
      /Unsupported file type/,
    );
  });

  it("treats files by extension when mime is missing", async () => {
    const file = new File(["body text"], "memo.txt", { type: "" });
    expect(await extractTextFromFile(file)).toBe("body text");
  });
});
