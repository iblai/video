import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

async function loadConfig() {
  vi.resetModules();
  const mod = await import("@/lib/iblai/config");
  return mod.default;
}

describe("config", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("derives lmsUrl/dmUrl/axdUrl from NEXT_PUBLIC_API_BASE_URL", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.example.com";
    const config = await loadConfig();
    expect(config.lmsUrl()).toBe("https://api.example.com/lms");
    expect(config.dmUrl()).toBe("https://api.example.com/dm");
    expect(config.axdUrl()).toBe("https://api.example.com/axd");
  });

  it("falls back to per-service subdomains of NEXT_PUBLIC_PLATFORM_BASE_DOMAIN", async () => {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    process.env.NEXT_PUBLIC_PLATFORM_BASE_DOMAIN = "iblai.app";
    const config = await loadConfig();
    expect(config.lmsUrl()).toBe("https://learn.iblai.app");
    expect(config.dmUrl()).toBe("https://base.manager.iblai.app");
    expect(config.authUrl()).toBe("https://auth.iblai.app");
  });

  it("exposes the main tenant key when set", async () => {
    process.env.NEXT_PUBLIC_MAIN_TENANT_KEY = "acme";
    const config = await loadConfig();
    expect(config.mainTenantKey()).toBe("acme");
  });

  it("returns empty string when main tenant key is unset", async () => {
    delete process.env.NEXT_PUBLIC_MAIN_TENANT_KEY;
    const config = await loadConfig();
    expect(config.mainTenantKey()).toBe("");
  });

  it("prefers window.__ENV__ over process.env at runtime", async () => {
    process.env.NEXT_PUBLIC_AUTH_URL = "https://build-time";
    (window as unknown as { __ENV__: Record<string, string> }).__ENV__ = {
      NEXT_PUBLIC_AUTH_URL: "https://runtime",
    };
    const config = await loadConfig();
    expect(config.authUrl()).toBe("https://runtime");
    delete (window as unknown as { __ENV__?: Record<string, string> }).__ENV__;
  });
});
