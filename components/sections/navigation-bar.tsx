"use client"

import Image from "@/components/iblai/base-image"
import { Button } from "@/components/ui/button"
import { Play, Menu } from "lucide-react"
import { useState } from "react"

interface NavigationBarProps {
  showNavBar: boolean
  activeSection: string
  scrollToWatch: () => void
  scrollToPricing: () => void
  scrollToFAQ: () => void
  scrollToTop: () => void
}

export function NavigationBar({
  showNavBar,
  activeSection,
  scrollToWatch,
  scrollToPricing,
  scrollToFAQ,
  scrollToTop,
}: NavigationBarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  if (!showNavBar) return null

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <Image
              src="/images/videogenai-logo.png"
              alt="videoAI Logo"
              width={200}
              height={40}
              className="h-6 sm:h-8 w-auto"
            />
            <span className="text-xl font-bold bg-gradient-to-r from-[#38A1E5] to-[#0078FF] bg-clip-text text-transparent">
              videoAI
            </span>
          </div>

          {/* Desktop Navigation Items */}
          <div className="hidden md:flex items-center space-x-6 lg:space-x-8">
            <button
              onClick={scrollToWatch}
              className={`flex items-center gap-2 transition-colors ${
                activeSection === "watch" ? "text-[#38A1E5]" : "text-[#3E6BAD] hover:text-[#2E5A9D]"
              }`}
            >
              <Image
                src="/images/design-mode/video.png"
                alt="Watch"
                width={20}
                height={20}
                className={`w-6 h-6 transition-all ${activeSection === "watch" ? "brightness-0 saturate-100" : ""}`}
                style={
                  activeSection === "watch"
                    ? {
                        filter:
                          "brightness(0) saturate(100%) invert(56%) sepia(89%) saturate(1392%) hue-rotate(178deg) brightness(95%) contrast(89%)",
                      }
                    : {}
                }
              />
              <span className="font-medium">Watch</span>
            </button>
            <button
              onClick={scrollToPricing}
              className={`flex items-center gap-2 transition-colors ${
                activeSection === "pricing" ? "text-[#38A1E5]" : "text-[#3E6BAD] hover:text-[#2E5A9D]"
              }`}
            >
              <Image
                src="/images/design-mode/pricing.png"
                alt="Pricing"
                width={20}
                height={20}
                className={`w-5 h-5 transition-all ${activeSection === "pricing" ? "brightness-0 saturate-100" : ""}`}
                style={
                  activeSection === "pricing"
                    ? {
                        filter:
                          "brightness(0) saturate(100%) invert(56%) sepia(89%) saturate(1392%) hue-rotate(178deg) brightness(95%) contrast(89%)",
                      }
                    : {}
                }
              />
              <span className="font-medium">Pricing</span>
            </button>
            <button
              onClick={scrollToFAQ}
              className={`flex items-center gap-2 transition-colors ${
                activeSection === "faq" ? "text-[#38A1E5]" : "text-[#3E6BAD] hover:text-[#2E5A9D]"
              }`}
            >
              <Image
                src="/images/design-mode/faq.png"
                alt="FAQ"
                width={20}
                height={20}
                className={`w-5 h-5 transition-all ${activeSection === "faq" ? "brightness-0 saturate-100" : ""}`}
                style={
                  activeSection === "faq"
                    ? {
                        filter:
                          "brightness(0) saturate(100%) invert(56%) sepia(89%) saturate(1392%) hue-rotate(178deg) brightness(95%) contrast(89%)",
                      }
                    : {}
                }
              />
              <span className="font-medium">FAQ</span>
            </button>
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={scrollToTop}
              className="flex items-center gap-1 px-2 py-1 bg-transparent border-2 border-transparent bg-gradient-to-r from-[#A6BBEE] to-[#0078FF] bg-clip-border hover:shadow-lg transition-all duration-200 text-xs"
              style={{
                background:
                  "linear-gradient(white, white) padding-box, linear-gradient(to right, #A6BBEE, #0078FF) border-box",
                border: "2px solid transparent",
              }}
            >
              <Play className="w-3 h-3 text-[#0078FF]" />
              <span className="text-[#0078FF] font-medium whitespace-nowrap">Start For Free</span>
            </Button>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-[#3E6BAD] hover:text-[#2E5A9D] transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200 py-2">
            <div className="flex flex-col space-y-2 px-4">
              <button
                onClick={() => {
                  scrollToWatch()
                  setIsMobileMenuOpen(false)
                }}
                className={`flex items-center gap-3 py-2 transition-colors ${
                  activeSection === "watch" ? "text-[#38A1E5]" : "text-[#3E6BAD] hover:text-[#2E5A9D]"
                }`}
              >
                <Image
                  src="/images/design-mode/video.png"
                  alt="Watch"
                  width={20}
                  height={20}
                  className={`w-6 h-6 transition-all ${activeSection === "watch" ? "brightness-0 saturate-100" : ""}`}
                  style={
                    activeSection === "watch"
                      ? {
                          filter:
                            "brightness(0) saturate(100%) invert(56%) sepia(89%) saturate(1392%) hue-rotate(178deg) brightness(95%) contrast(89%)",
                        }
                      : {}
                  }
                />
                <span className="font-medium">Watch</span>
              </button>
              <button
                onClick={() => {
                  scrollToPricing()
                  setIsMobileMenuOpen(false)
                }}
                className={`flex items-center gap-3 py-2 transition-colors ${
                  activeSection === "pricing" ? "text-[#38A1E5]" : "text-[#3E6BAD] hover:text-[#2E5A9D]"
                }`}
              >
                <Image
                  src="/images/design-mode/pricing.png"
                  alt="Pricing"
                  width={20}
                  height={20}
                  className={`w-5 h-5 transition-all ${activeSection === "pricing" ? "brightness-0 saturate-100" : ""}`}
                  style={
                    activeSection === "pricing"
                      ? {
                          filter:
                            "brightness(0) saturate(100%) invert(56%) sepia(89%) saturate(1392%) hue-rotate(178deg) brightness(95%) contrast(89%)",
                        }
                      : {}
                  }
                />
                <span className="font-medium">Pricing</span>
              </button>
              <button
                onClick={() => {
                  scrollToFAQ()
                  setIsMobileMenuOpen(false)
                }}
                className={`flex items-center gap-3 py-2 transition-colors ${
                  activeSection === "faq" ? "text-[#38A1E5]" : "text-[#3E6BAD] hover:text-[#2E5A9D]"
                }`}
              >
                <Image
                  src="/images/design-mode/faq.png"
                  alt="FAQ"
                  width={20}
                  height={20}
                  className={`w-5 h-5 transition-all ${activeSection === "faq" ? "brightness-0 saturate-100" : ""}`}
                  style={
                    activeSection === "faq"
                      ? {
                          filter:
                            "brightness(0) saturate(100%) invert(56%) sepia(89%) saturate(1392%) hue-rotate(178deg) brightness(95%) contrast(89%)",
                        }
                      : {}
                  }
                />
                <span className="font-medium">FAQ</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
