/**
 * Sub-path deployment helpers.
 *
 * Next's `basePath` config mounts the whole app at a prefix (e.g.
 * `/videoai`). Next applies the prefix automatically to:
 *   - `<Link href="...">`
 *   - `router.push("...")` / `router.replace("...")`
 *   - `next/image` (`src="/..."`)
 *   - bundled scripts/styles
 *
 * It does NOT apply the prefix to:
 *   - `window.location.href = "/foo"` (raw browser nav)
 *   - plain `<img src="/foo">` tags
 *   - `fetch("/api/...")` from the client
 *   - URLs you concat manually (`window.location.origin + "/foo"`)
 *
 * Use `getBasePath()` / `withBasePath()` at those call sites.
 *
 * `usePathname()` from `next/navigation` STRIPS the base path before
 * returning, so comparisons against literal `/foo` keep working. Reads
 * of `window.location.pathname` do NOT strip -- use `stripBasePath()`
 * before comparing to a literal route.
 */

/**
 * Configured base path (e.g. `/videoai`). Empty string when deployed
 * at the root. Value is inlined at build time via Next env-var
 * substitution.
 */
export function getBasePath(): string {
  const raw = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  if (!raw || raw === "/") return "";
  return raw.replace(/\/+$/, "");
}

/**
 * Prepend the base path to an app-relative path.
 *
 *   withBasePath("/videos/my")            -> "/videoai/videos/my"
 *   withBasePath("")                       -> "/videoai"
 *   withBasePath("/")                      -> "/videoai"
 *   withBasePath("https://example.com/x")  -> unchanged (absolute URL)
 */
export function withBasePath(path: string): string {
  if (!path) return getBasePath() || "/";
  if (/^https?:\/\//i.test(path)) return path;
  const bp = getBasePath();
  if (!bp) return path;
  if (path === "/") return bp;
  if (path.startsWith(bp + "/") || path === bp) return path;
  return `${bp}${path.startsWith("/") ? "" : "/"}${path}`;
}

/**
 * Strip the base path from a `window.location.pathname`-style value
 * so it can be compared against route literals (`/community`, etc.).
 * Returns the original input when no base path is set.
 */
export function stripBasePath(pathname: string): string {
  if (!pathname) return pathname;
  const bp = getBasePath();
  if (!bp) return pathname;
  if (pathname === bp) return "/";
  if (pathname.startsWith(bp + "/")) return pathname.slice(bp.length);
  return pathname;
}
