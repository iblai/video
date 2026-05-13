"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ShieldAlert } from "lucide-react";

import { useIsAdmin } from "@/hooks/use-is-admin";
import { AppHeader } from "@/components/app-header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";

/**
 * Whole-app gate. Non-admins on the current tenant see a full-page
 * error layout (mirroring mentorai's `ErrorPage`) instead of any app
 * UI. The navbar stays mounted so the user can switch tenants or log
 * out from the profile dropdown without leaving the page first.
 */
export function AdminGuard({ children }: { children: ReactNode }) {
  const isAdmin = useIsAdmin();
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setResolved(true), 0);
    return () => window.clearTimeout(id);
  }, []);

  if (!resolved) return null;
  if (isAdmin) return <>{children}</>;

  return (
    <div className="flex min-h-screen w-full flex-col bg-white">
      <AppHeader />
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="flex w-full max-w-4xl flex-col items-center justify-center gap-4 md:flex-row md:gap-8">
          <div className="flex h-48 w-48 items-center justify-center rounded-full bg-gray-100 md:h-64 md:w-64">
            <ShieldAlert className="h-24 w-24 text-[#0058CC] md:h-32 md:w-32" />
          </div>
          <div className="flex flex-col items-center">
            <h1 className="text-center text-6xl font-bold text-[#0058CC] md:text-8xl">
              403
            </h1>
            <h2 className="mt-4 text-center text-2xl font-medium text-gray-500 md:text-3xl">
              Admin access required
            </h2>
            <p className="mt-4 max-w-md text-center text-sm text-gray-600">
              You need to be a platform admin to access this website. Switch
              to a tenant where you have admin rights via the profile menu
              above, or contact ibl.ai for help.
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
