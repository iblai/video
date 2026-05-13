import { describe, expect, it, vi } from "vitest";
import { extractTextFromFile } from "@/lib/scripts/extract-text";

vi.mock("mammoth", () => ({
  extractRawText: vi.fn(async () => ({ value: "from-docx" })),
}));

vi.mock("pdfjs-dist", () => {
  const items = [{ str: "page1-a" }, { str: "page1-b" }, { foo: "ignored" }];
  return {
    GlobalWorkerOptions: { workerSrc: "" },
    getDocument: vi.fn(() => ({
      promise: Promise.resolve({
        numPages: 1,
        getPage: async () => ({
          getTextContent: async () => ({ items }),
        }),
      }),
    })),
  };
});

vi.mock("jszip", () => ({
  default: {
    loadAsync: vi.fn(async () => ({
      files: {
        "ppt/slides/slide2.xml": {
          async: async () => "<a:t>Slide two &amp; rest</a:t>",
        },
        "ppt/slides/slide1.xml": {
          async: async () =>
            '<a:t>Slide one &lt;tag&gt; "ok" &apos;done&apos;</a:t>',
        },
        "ppt/slides/slide3.xml": {
          async: async () => "<other>no a:t here</other>",
        },
      },
    })),
  },
}));

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

  it("uses mammoth to read .docx files", async () => {
    const file = new File(["fake"], "doc.docx");
    expect(await extractTextFromFile(file)).toBe("from-docx");
  });

  it("collapses pdfjs text items into a single page string", async () => {
    const file = new File(["fake"], "doc.pdf", { type: "application/pdf" });
    expect(await extractTextFromFile(file)).toBe("page1-a page1-b");
  });

  it("matches PDFs by extension when mime is missing", async () => {
    const file = new File(["fake"], "doc.pdf", { type: "" });
    expect(await extractTextFromFile(file)).toBe("page1-a page1-b");
  });

  it("decodes pptx slide XML in slide order, dropping empty slides", async () => {
    const file = new File(["fake"], "deck.pptx");
    const text = await extractTextFromFile(file);
    expect(text).toBe('Slide one <tag> "ok" \'done\'\n\nSlide two & rest');
  });

  it("returns an empty string when mammoth has no value", async () => {
    const mammoth = await import("mammoth");
    (mammoth.extractRawText as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ value: undefined });
    const file = new File(["fake"], "empty.docx");
    expect(await extractTextFromFile(file)).toBe("");
  });
});
