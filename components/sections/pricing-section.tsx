"use client"

import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"

export function PricingSection() {
  return (
    <section id="pricing-section" className="min-h-screen bg-white flex items-center justify-center py-16 px-4">
      <div className="max-w-7xl mx-auto w-full">
        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Basic Plan */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 flex flex-col h-auto md:h-[850px]">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-600 mb-2">Basic</h3>
              <div className="text-2xl font-bold text-gray-600 mb-1">Free</div>
              <p className="text-sm text-gray-500">No credit card required</p>
            </div>
            <Button className="w-full mb-6 bg-white border border-gray-300 text-gray-900 hover:bg-gray-50">
              Get started
            </Button>
            <div className="flex-1 flex flex-col">
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-600 mb-3">BASIC PLAN INCLUDES</div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4" style={{ color: "#254dee" }} />
                    <span className="text-sm text-gray-700">3 AI Videos per month</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4" style={{ color: "#254dee" }} />
                    <span className="text-sm text-gray-700">Basic avatar library</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4" style={{ color: "#254dee" }} />
                    <span className="text-sm text-gray-700">720p video quality</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4" style={{ color: "#254dee" }} />
                    <span className="text-sm text-gray-700">5 minutes max per video</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Starter Plan */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 flex flex-col h-auto md:h-[850px]">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-600 mb-2">Starter</h3>
              <div className="text-2xl font-bold text-gray-600 mb-1">$18/mo</div>
              <p className="text-sm text-gray-500">Billed yearly. Pay monthly</p>
            </div>
            <Button className="w-full mb-6 bg-white border border-gray-300 text-gray-900 hover:bg-gray-50">
              Get started
            </Button>
            <div className="flex-1 flex flex-col">
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-600 mb-3">KEY FEATURES</div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4" style={{ color: "#254dee" }} />
                    <span className="text-sm text-gray-700">Premium avatar library</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4" style={{ color: "#254dee" }} />
                    <span className="text-sm text-gray-700">AI voice cloning</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4" style={{ color: "#254dee" }} />
                    <span className="text-sm text-gray-700">40+ languages</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4" style={{ color: "#254dee" }} />
                    <span className="text-sm text-gray-700">Remove videoAI watermark</span>
                  </div>
                </div>
                <div className="text-sm font-medium text-gray-600 mb-3 mt-6">INCLUDES</div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4" style={{ color: "#254dee" }} />
                    <span className="text-sm text-gray-700">20 AI Videos per month</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4" style={{ color: "#254dee" }} />
                    <span className="text-sm text-gray-700">1080p HD quality</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4" style={{ color: "#254dee" }} />
                    <span className="text-sm text-gray-700">15 minutes max per video</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4" style={{ color: "#254dee" }} />
                    <span className="text-sm text-gray-700">Email support</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Creator Plan - Most Popular */}
          <div className="relative flex flex-col h-auto md:h-[850px]">
            <div className="bg-gradient-to-b from-blue-50 from-30% to-white border-2 border-blue-200 rounded-lg p-6 flex flex-col h-full pt-8">
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-600 mb-2">Creator</h3>
                <div className="text-2xl font-bold text-gray-600 mb-1">$64/mo</div>
                <p className="text-sm text-gray-500">Billed yearly. Pay monthly</p>
              </div>
              <Button className="w-full mb-6 bg-white border border-gray-300 text-gray-900 hover:bg-gray-50">
                Get started
              </Button>
              <div className="flex-1 flex flex-col">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-600 mb-3">WHAT YOU GET IN STARTER +</div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4" style={{ color: "#254dee" }} />
                      <span className="text-sm text-gray-700">5 Custom avatars</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4" style={{ color: "#254dee" }} />
                      <span className="text-sm text-gray-700">Advanced AI models</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4" style={{ color: "#254dee" }} />
                      <span className="text-sm text-gray-700">Custom branding</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4" style={{ color: "#254dee" }} />
                      <span className="text-sm text-gray-700">API access</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4" style={{ color: "#254dee" }} />
                      <span className="text-sm text-gray-700">Batch video generation</span>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-gray-600 mb-3 mt-6">INCLUDES</div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4" style={{ color: "#254dee" }} />
                      <span className="text-sm text-gray-700">100 AI Videos per month</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4" style={{ color: "#254dee" }} />
                      <span className="text-sm text-gray-700">4K video quality</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4" style={{ color: "#254dee" }} />
                      <span className="text-sm text-gray-700">30 minutes max per video</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4" style={{ color: "#254dee" }} />
                      <span className="text-sm text-gray-700">Priority support</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enterprise Plan */}
          <div className="relative flex flex-col h-auto md:h-[850px]">
            <div className="bg-gradient-to-br from-[#4f46e5] to-[#3b82f6] rounded-lg p-6 text-white flex flex-col h-full pt-8">
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-white mb-2">Enterprise</h3>
                <div className="text-lg font-medium text-white mb-1">Let's talk.</div>
                <p className="text-sm text-blue-100">Custom pricing</p>
              </div>
              <Button className="w-full mb-6 bg-white text-blue-600 hover:bg-gray-50">Book demo</Button>
              <div className="flex-1 flex flex-col">
                <div className="flex-1">
                  <div className="text-sm font-medium text-white mb-3">WHAT YOU GET IN CREATOR +</div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-white" />
                      <span className="text-sm text-white">Unlimited AI videos</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-white" />
                      <span className="text-sm text-white">Unlimited custom avatars</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-white" />
                      <span className="text-sm text-white">White-label solution</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-white" />
                      <span className="text-sm text-white">Advanced analytics</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-white" />
                      <span className="text-sm text-white">SSO/SAML integration</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-white" />
                      <span className="text-sm text-white">Team collaboration</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-white" />
                      <span className="text-sm text-white">Custom AI training</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-white" />
                      <span className="text-sm text-white">Dedicated infrastructure</span>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-white mb-3 mt-6">★ ENTERPRISE SUCCESS SUITE</div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-white" />
                      <span className="text-sm text-white">Dedicated account manager</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-white" />
                      <span className="text-sm text-white">Custom onboarding</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-white" />
                      <span className="text-sm text-white">24/7 priority support</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-white" />
                      <span className="text-sm text-white">Training & certification</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-white" />
                      <span className="text-sm text-white">SLA guarantees</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
