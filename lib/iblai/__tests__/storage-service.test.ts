import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { LocalStorageService } from "@/lib/iblai/storage-service";

describe("LocalStorageService", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it("getInstance returns a singleton", () => {
    const a = LocalStorageService.getInstance();
    const b = LocalStorageService.getInstance();
    expect(a).toBe(b);
  });

  it("setItem writes to localStorage and getItem reads it back", async () => {
    const svc = LocalStorageService.getInstance();
    await svc.setItem("k", "value");
    expect(localStorage.getItem("k")).toBe("value");
    await expect(svc.getItem("k")).resolves.toBe("value");
  });

  it("returns null when getItem misses", async () => {
    const svc = LocalStorageService.getInstance();
    await expect(svc.getItem("missing")).resolves.toBeNull();
  });

  it("removeItem clears the entry", async () => {
    const svc = LocalStorageService.getInstance();
    localStorage.setItem("k", "v");
    await svc.removeItem("k");
    expect(localStorage.getItem("k")).toBeNull();
  });
});
