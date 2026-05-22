"use client"

import Image from "@/components/iblai/base-image"
import { Button } from "@/components/ui/button"
import { Check, ArrowRight } from "lucide-react"

export function WatchSection() {
  return (
    <section id="watch-section" className="min-h-screen bg-gray-50 flex items-center justify-center py-16 px-4">
      <div className="max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            {/* Main Heading */}
            <div className="space-y-4">
              <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-600 leading-tight">
                <span className="block">
                  Create Realistic <span className="text-blue-500">Interactive Avatars</span> and{" "}
                  <span className="text-blue-500">Video Clips</span>
                </span>
              </h1>
            </div>

            {/* Feature List */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mt-0.5">
                  <Check className="w-4 h-4 text-white" />
                </div>
                <p className="text-gray-700 text-lg">Train them by following your unique pedagogy</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mt-0.5">
                  <Check className="w-4 h-4 text-white" />
                </div>
                <p className="text-gray-700 text-lg">Select from multiple AI models and voice options</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mt-0.5">
                  <Check className="w-4 h-4 text-white" />
                </div>
                <p className="text-gray-700 text-lg">Bring faculty and institution to the next level</p>
              </div>
            </div>

            {/* Get Started Button */}
            <div className="pt-4">
              <Button className="bg-white hover:bg-gray-50 text-gray-600 border border-gray-300 px-8 py-3 rounded-lg font-medium flex items-center gap-2 shadow-sm">
                Get Started
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Right Content */}
          <div className="relative flex items-center justify-center">
            {/* Video Container with Custom Gradient and Border Radius */}
            <div
              className="relative w-full max-w-[800px] h-[300px] sm:h-[350px] md:h-[400px] lg:h-[450px] flex flex-col items-center justify-center overflow-hidden mx-4"
              style={{
                background: "linear-gradient(135deg, #FFFFFF 0%, #D7EEFC 50%, #5EB8F2 100%)",
                borderRadius: "35px",
                borderBottomLeftRadius: "35px",
                borderBottomRightRadius: "100px",
              }}
            >
              {/* Play Button - Positioned on Left Top */}
              <button
                className="absolute left-4 sm:left-8 top-4 sm:top-8 w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow z-10"
                style={{ border: "2px solid #C1C5C3" }}
              >
                <div
                  className="w-4 h-4 sm:w-6 sm:h-6 bg-gray-700 flex items-center justify-center"
                  style={{
                    clipPath: "polygon(0 0, 100% 50%, 0 100%)",
                    marginLeft: "2px",
                  }}
                ></div>
              </button>

              {/* Vertical Logo - Centered with proper spacing */}
              <div className="flex flex-col items-center justify-center px-8 sm:px-12 md:px-16">
                <Image
                  src="/images/videogenai-logo.png"
                  alt="videoAI Logo"
                  width={80}
                  height={80}
                  className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 object-contain mb-4"
                />
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#38A1E5] to-[#0078FF] bg-clip-text text-transparent">
                  videoAI
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute top-4 right-4 w-12 h-12 sm:w-20 sm:h-20 bg-white/20 rounded-full"></div>
              <div className="absolute bottom-4 left-4 w-8 h-8 sm:w-12 sm:h-12 bg-white/20 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
