import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Blob URL helpers (file upload tests).
if (typeof URL.createObjectURL === "undefined") {
  URL.createObjectURL = vi.fn(() => "blob:mock-url");
}
if (typeof URL.revokeObjectURL === "undefined") {
  URL.revokeObjectURL = vi.fn();
}

// localStorage mock — class-backed so tests can spy on prototype methods.
class LocalStorageMock implements Storage {
  private store: Record<string, string> = {};
  get length() {
    return Object.keys(this.store).length;
  }
  clear() {
    this.store = {};
  }
  getItem(k: string) {
    return this.store[k] ?? null;
  }
  key(i: number) {
    return Object.keys(this.store)[i] ?? null;
  }
  removeItem(k: string) {
    delete this.store[k];
  }
  setItem(k: string, v: string) {
    this.store[k] = v;
  }
}
Object.defineProperty(window, "localStorage", {
  value: new LocalStorageMock(),
  writable: true,
});

// Radix UI in jsdom requires pointer-capture polyfills.
if (typeof Element.prototype.hasPointerCapture === "undefined") {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
}

// matchMedia + ResizeObserver stubs (shadcn / Radix primitives).
if (typeof window.matchMedia === "undefined") {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: false,
    media: q,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}
if (typeof window.ResizeObserver === "undefined") {
  // @ts-expect-error jsdom missing global
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
