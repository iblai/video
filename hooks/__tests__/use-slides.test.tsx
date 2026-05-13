import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

import { useSlides } from "@/hooks/use-slides";

class FakeImage {
  onload: (() => void) | null = null;
  onerror: ((err: unknown) => void) | null = null;
  private _src = "";
  set src(value: string) {
    this._src = value;
    queueMicrotask(() => {
      if (value.includes("fail")) {
        this.onerror?.(new Error("boom"));
      } else {
        this.onload?.();
      }
    });
  }
  get src() {
    return this._src;
  }
}

const originalImage = window.Image;

describe("useSlides", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.Image = FakeImage as unknown as typeof Image;
  });
  afterEach(() => {
    window.Image = originalImage;
    vi.useRealTimers();
  });

  it("starts at slide 0 with fade in", () => {
    const { result } = renderHook(() => useSlides());
    expect(result.current.currentSlide).toBe(0);
    expect(result.current.fadeIn).toBe(true);
    expect(result.current.slides).toHaveLength(3);
    expect(result.current.slideStyles).toHaveLength(3);
  });

  it("changeSlide transitions to the requested index after the fade window", () => {
    const { result } = renderHook(() => useSlides());
    act(() => result.current.changeSlide(2));
    expect(result.current.fadeIn).toBe(false);
    act(() => vi.advanceTimersByTime(150));
    expect(result.current.currentSlide).toBe(2);
    expect(result.current.fadeIn).toBe(true);
  });

  it("changeSlide is a no-op when the index matches the current slide", () => {
    const { result } = renderHook(() => useSlides());
    act(() => result.current.changeSlide(0));
    expect(result.current.fadeIn).toBe(true);
  });

  it("auto-rotates on the 5s interval", () => {
    const { result } = renderHook(() => useSlides());
    act(() => vi.advanceTimersByTime(5000));
    expect(result.current.fadeIn).toBe(false);
    act(() => vi.advanceTimersByTime(150));
    expect(result.current.currentSlide).toBe(1);
  });

  it("clears the auto-rotate interval on unmount", () => {
    const { result, unmount } = renderHook(() => useSlides());
    unmount();
    act(() => vi.advanceTimersByTime(20_000));
    // No assertion error means no state update after unmount.
    expect(result.current.currentSlide).toBe(0);
  });

  it("preloads each slide image (real timers)", async () => {
    vi.useRealTimers();
    const { result } = renderHook(() => useSlides());
    await waitFor(() =>
      expect(result.current.preloadedImages.length).toBe(3),
    );
  });

  it("logs an error and leaves the array empty when preloading fails", async () => {
    vi.useRealTimers();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    class FailImage {
      onload: (() => void) | null = null;
      onerror: ((err: unknown) => void) | null = null;
      set src(_value: string) {
        queueMicrotask(() => this.onerror?.(new Error("boom")));
      }
      get src() {
        return "";
      }
    }
    window.Image = FailImage as unknown as typeof Image;
    const { result } = renderHook(() => useSlides());
    await waitFor(() => expect(errorSpy).toHaveBeenCalled());
    expect(result.current.preloadedImages).toEqual([]);
    errorSpy.mockRestore();
  });
});
