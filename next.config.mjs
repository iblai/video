// ibl.ai: Node.js 22+ localStorage polyfill (missing getItem/setItem in SSR)
if (typeof window === "undefined" && typeof localStorage !== "undefined" && typeof localStorage.getItem !== "function") {
  const _s = {};
  globalThis.localStorage = {
    getItem: (k) => (_s[k] ?? null),
    setItem: (k, v) => { _s[k] = String(v); },
    removeItem: (k) => { delete _s[k]; },
    clear: () => { for (const k in _s) delete _s[k]; },
    get length() { return Object.keys(_s).length; },
    key: (i) => Object.keys(_s)[i] ?? null,
  };
}

import { createRequire } from "module";

const require = createRequire(import.meta.url);

/**
 * Resolve a package to its root directory so webpack never loads duplicate
 * copies (can happen in npm/pnpm hoisting with differing peer deps).
 */
function dedup(packageName) {
  try {
    const entry = require.resolve(packageName);
    const marker = `node_modules/${packageName}`;
    const idx = entry.lastIndexOf(marker);
    if (idx !== -1) return entry.slice(0, idx + marker.length);
    return undefined;
  } catch {
    return undefined;
  }
}

const resolveAliases = {};
const dataLayerDir = dedup("@iblai/data-layer");
if (dataLayerDir) resolveAliases["@iblai/data-layer"] = dataLayerDir;
const rtkDir = dedup("@reduxjs/toolkit");
if (rtkDir) resolveAliases["@reduxjs/toolkit"] = rtkDir;
const reactReduxDir = dedup("react-redux");
if (reactReduxDir) resolveAliases["react-redux"] = reactReduxDir;

// Sub-path deployment support. Set `NEXT_PUBLIC_BASE_PATH=/videoai` in
// `.env.production` (or the hosting env) to mount the app under that
// prefix. Must start with `/` and not end with `/`. Empty / unset =
// root deploy (dev default).
const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ""
const basePath =
  rawBasePath && rawBasePath !== "/"
    ? rawBasePath.replace(/\/+$/, "")
    : ""

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone build keeps the production image small: Next emits a
  // self-contained `server.js` + minimal `node_modules` under
  // `.next/standalone`, which is what the Dockerfile copies into the
  // runner stage.
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  // Mount the whole app under `basePath`. Next applies it automatically
  // to Link, router.push/replace, next/image src, public/* assets, and
  // bundled scripts. It does NOT prefix raw `window.location.href =
  // "/..."`, plain `<img src="/...">`, or `fetch("/api/...")` -- those
  // use the `withBasePath` helper at call sites.
  //
  // Do NOT set `assetPrefix` alongside `basePath` for a same-origin
  // sub-path deploy: assetPrefix is for CDN scenarios and stacks with
  // basePath, producing double-prefixed URLs like
  // `/videoai/videoai/images/...` that 404 against the public folder.
  ...(basePath ? { basePath } : {}),
  images: {
    // Skip Next's built-in image optimizer. Avatar URLs come from
    // arbitrary HeyGen/external hosts and the SDK proxies images
    // already; we don't need on-the-fly resizing.
    //
    // basePath prefixing for local `/images/...` srcs is handled by the
    // `<Image>` wrapper at `components/iblai/base-image.tsx` -- the
    // `images.loaderFile` config option is webpack-only and is silently
    // ignored under Turbopack (Next 16's default dev bundler).
    unoptimized: true,
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  turbopack: {},
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};
    // ibl.ai: Stub @tauri-apps/api imports (not needed for web-only apps)
    config.resolve.alias["@tauri-apps/api/core"] = false;
    config.resolve.alias["@tauri-apps/api/event"] = false;
    // ibl.ai: Deduplicate @reduxjs/toolkit + react-redux (shared Redux context)
    Object.assign(config.resolve.alias, resolveAliases);
    return config;
  },
}

export default nextConfig
