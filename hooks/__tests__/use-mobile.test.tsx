import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { useIsMobile } from "@/hooks/use-mobile";

type Listener = () => void;

interface FakeMql {
  matches: boolean;
  media: string;
  onchange: null;
  addListener: () => void;
  removeListener: () => void;
  addEventListener: (event: string, listener: Listener) => void;
  removeEventListener: (event: string, listener: Listener) => void;
  dispatchEvent: () => boolean;
  __listeners: Listener[];
}

function makeMql(): FakeMql {
  const listeners: Listener[] = [];
  return {
    matches: false,
    media: "",
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: (_event, listener) => {
      listeners.push(listener);
    },
    removeEventListener: (_event, listener) => {
      const idx = listeners.indexOf(listener);
      if (idx >= 0) listeners.splice(idx, 1);
    },
    dispatchEvent: () => true,
    __listeners: listeners,
  };
}

const originalInnerWidth = window.innerWidth;
let currentMql: FakeMql;

describe("useIsMobile", () => {
  beforeEach(() => {
    currentMql = makeMql();
    window.matchMedia = vi.fn(() => currentMql) as unknown as typeof window.matchMedia;
  });
  afterEach(() => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: originalInnerWidth,
    });
  });

  it("returns false when the viewport is wider than the breakpoint", () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 1024,
    });
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it("returns true when the viewport is narrower than the breakpoint", () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 320,
    });
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it("re-evaluates on the matchMedia change event", () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 1024,
    });
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 320,
    });
    act(() => {
      currentMql.__listeners.forEach((l) => l());
    });
    expect(result.current).toBe(true);
  });

  it("removes the change listener on unmount", () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 1024,
    });
    const { unmount } = renderHook(() => useIsMobile());
    expect(currentMql.__listeners.length).toBe(1);
    unmount();
    expect(currentMql.__listeners.length).toBe(0);
  });
});
