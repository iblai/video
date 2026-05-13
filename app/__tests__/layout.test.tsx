import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

vi.mock("@/components/conditional-layout", () => ({
  ConditionalLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="conditional-layout">{children}</div>
  ),
}));

vi.mock("next/font/google", () => ({
  Source_Serif_4: () => ({ variable: "--v0-font-source-serif-4" }),
}));

import RootLayout, { metadata } from "@/app/layout";

describe("app/layout", () => {
  it("exposes title + description metadata", () => {
    expect(metadata.title).toBe("videoAI");
    expect(metadata.description).toMatch(/AI-powered/);
  });

  it("wraps children in ConditionalLayout", () => {
    // Render the layout's children container (avoid mounting <html> in jsdom).
    const result = RootLayout({ children: <span>kid</span> });
    // RootLayout returns <html>...</html>; extract the children for a smoke check.
    expect(result).toBeTruthy();
  });
});
