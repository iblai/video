"use client"

import Image from "@/components/iblai/base-image"

export function Footer() {
  return (
    <footer className="border-t border-gray-200 px-6 py-4 bg-white">
      <div className="w-full flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center gap-6">
          <a href="https://ibl.ai/privacy-policy" target="_blank" rel="noopener noreferrer" className="hover:text-gray-700">
            Privacy Policy
          </a>
          <a href="https://ibl.ai/terms-of-use" target="_blank" rel="noopener noreferrer" className="hover:text-gray-700">
            Terms & Conditions
          </a>
        </div>
        <div className="flex items-center gap-2">
          <span>Powered by</span>
          <Image src="/images/iblai-logo.png" alt="ibl.ai" width={40} height={16} className="object-contain mb-1" />
        </div>
      </div>
    </footer>
  )
}
