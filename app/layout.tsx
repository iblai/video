import type React from "react"
import type { Metadata } from "next"
import Script from "next/script"

import "./globals.css"
import { ConditionalLayout } from "@/components/conditional-layout"

import { Source_Serif_4 as V0_Font_Source_Serif_4 } from "next/font/google"

// `entrypoint.sh` writes `/app/public/env.js` at container start, exposing
// runtime-overridable `NEXT_PUBLIC_*` vars on `window.__ENV__` (see
// `lib/iblai/config.ts`). The script must run before our React tree
// hydrates so `runtimeEnv()` has values when consumers read them.
//
// `basePath` is build-time only -- a runtime override would require a
// rebuild, so it's still read from `process.env` here, not from env.js.
const ENV_JS_SRC = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/env.js`

const _sourceSerif_4 = V0_Font_Source_Serif_4({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800", "900"],
  variable: "--v0-font-source-serif-4",
})

const _v0_fontVariables = `${_sourceSerif_4.variable}`

export const metadata: Metadata = {
  title: "videoAI",
  description: "AI-powered video generation platform",
    generator: 'v0.app'
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={_v0_fontVariables}>
      <body className={_v0_fontVariables}>
        <Script src={ENV_JS_SRC} strategy="beforeInteractive" />
        <ConditionalLayout>{children}</ConditionalLayout>
      </body>
    </html>
  )
}
