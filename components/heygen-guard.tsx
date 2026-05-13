"use client";

import { useEffect, useState, type ReactNode } from "react";
import { PlugZap } from "lucide-react";

import config from "@/lib/iblai/config";
import { resolveAppTenant } from "@/lib/iblai/tenant";
import { AppHeader } from "@/components/app-header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";

type CheckState = "checking" | "ok" | "missing";

async function hasHeygenCredential(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const token = localStorage.getItem("dm_token");
  const tenant = resolveAppTenant();
  if (!token || !tenant) return false;

  const url =
    `${config.dmUrl()}/api/ai-account/orgs/${encodeURIComponent(tenant)}` +
    `/integration-credential/?name=heygen`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Token ${token}`,
        Accept: "application/json",
      },
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (!Array.isArray(data)) return false;
    return data.some(
      (entry) =>
        entry &&
        (entry.name === "heygen" || entry.name === "heygen-private") &&
        typeof entry.value?.key === "string" &&
        entry.value.key.length > 0,
    );
  } catch {
    return false;
  }
}

/**
 * Verifies the tenant has a HeyGen integration credential configured.
 * If not, replaces the app with a full-page error layout. The navbar
 * stays mounted so the user can switch tenants or log out from the
 * profile dropdown without leaving the page first.
 *
 * Renders nothing during the probe so the app shell doesn't flash
 * before the gating decision lands.
 */
export function HeygenGuard({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CheckState>("checking");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ok = await hasHeygenCredential();
      if (!cancelled) setState(ok ? "ok" : "missing");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "checking") return null;
  if (state === "ok") return <>{children}</>;

  return (
    <div className="flex min-h-screen w-full flex-col bg-white">
      <AppHeader />
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="flex w-full max-w-4xl flex-col items-center justify-center gap-4 md:flex-row md:gap-8">
          <div className="flex h-48 w-48 items-center justify-center rounded-full bg-gray-100 md:h-64 md:w-64">
            <PlugZap className="h-24 w-24 text-[#0058CC] md:h-32 md:w-32" />
          </div>
          <div className="flex flex-col items-center">
            <h1 className="text-center text-6xl font-bold text-[#0058CC] md:text-8xl">
              424
            </h1>
            <h2 className="mt-4 text-center text-2xl font-medium text-gray-500 md:text-3xl">
              HeyGen integration required
            </h2>
            <p className="mt-4 max-w-md text-center text-sm text-gray-600">
              Add a HeyGen API key under integration credentials before
              continuing. Switch to a tenant that already has one
              provisioned via the profile menu above, or contact ibl.ai
              for help.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 md:gap-4">
              <a
                href="https://ibl.ai/contact"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600">
                  Contact ibl.ai
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
