import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/iblai/tenant", () => ({
  resolveAppTenant: () => mockedTenant,
}));

let mockedTenant = "acme";

import { openaiProxyAuthHeaders, openaiProxyUrl } from "@/lib/openai/proxy";

describe("openaiProxyUrl", () => {
  it("prefixes paths with /api/openai/", () => {
    expect(openaiProxyUrl("v1/chat/completions")).toBe(
      "/api/openai/v1/chat/completions",
    );
  });

  it("strips a leading slash before joining", () => {
    expect(openaiProxyUrl("/v1/audio/transcriptions")).toBe(
      "/api/openai/v1/audio/transcriptions",
    );
  });
});

describe("openaiProxyAuthHeaders", () => {
  beforeEach(() => {
    localStorage.clear();
    mockedTenant = "acme";
  });
  afterEach(() => {
    localStorage.clear();
  });

  it("returns Token + X-Platform headers when both are present", () => {
    localStorage.setItem("dm_token", "fake-dm-token");
    expect(openaiProxyAuthHeaders()).toEqual({
      Authorization: "Token fake-dm-token",
      "X-Platform": "acme",
    });
  });

  it("throws when the DM token is missing", () => {
    expect(() => openaiProxyAuthHeaders()).toThrow(/missing DM token/);
  });

  it("throws when no tenant resolves", () => {
    localStorage.setItem("dm_token", "fake-dm-token");
    mockedTenant = "";
    expect(() => openaiProxyAuthHeaders()).toThrow(/no tenant resolved/);
  });
});
