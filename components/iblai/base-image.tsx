"use client"

import NextImage, { type ImageProps } from "next/image"

import { withBasePath } from "@/lib/iblai/base-path"

/**
 * Drop-in replacement for `next/image` that respects the configured
 * `basePath`.
 *
 * Why:
 *   - Next 16's `images.unoptimized: true` returns the `src`
 *     unchanged, so `<Image src="/images/...">` never gets the basePath
 *     prefix and 404s under a sub-path deploy.
 *   - The custom `images.loaderFile` alias is webpack-only; Turbopack
 *     (Next 16's default dev bundler) silently ignores it.
 *
 * This wrapper normalises root-relative string `src` values through
 * `withBasePath()` and forces `unoptimized` so Next emits a plain
 * `<img>` with the prefixed URL the browser can fetch directly. Static
 * imports and remote URLs flow through untouched.
 */
export default function Image({ src, unoptimized, ...rest }: ImageProps) {
  const resolvedSrc =
    typeof src === "string" ? withBasePath(src) : src
  return (
    <NextImage
      src={resolvedSrc}
      unoptimized={unoptimized ?? true}
      {...rest}
    />
  )
}

export type { ImageProps }
