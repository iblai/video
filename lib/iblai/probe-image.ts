/**
 * Resolve true if the image URL is still reachable (not expired).
 *
 * Uses an `Image()` element rather than `fetch`, because `<img>` loads
 * are exempt from CORS and the browser fires `onerror` directly on a
 * 403/404. `fetch(..., { mode: "no-cors" })` returns an opaque
 * response that always looks 200 to JS, so it can't tell good URLs
 * from expired ones.
 *
 * Lives in its own module so tests can `vi.mock` it instead of
 * stubbing `Image` (JSDOM doesn't fire `onload`/`onerror` by default).
 */
export function probeImage(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(true);
      return;
    }
    if (!url || url === "/placeholder.svg") {
      resolve(false);
      return;
    }
    const img = new window.Image();
    let settled = false;
    const done = (ok: boolean) => {
      if (settled) return;
      settled = true;
      resolve(ok);
    };
    img.onload = () => done(img.naturalWidth > 0);
    img.onerror = () => done(false);
    // Belt-and-braces timeout so a hung CDN doesn't stall the page.
    window.setTimeout(() => done(false), 5000);
    img.src = url;
  });
}
