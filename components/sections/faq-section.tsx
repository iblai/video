"use client"

import { useState } from "react"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Minus } from "lucide-react"

export function FAQSection() {
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(0) // First question expanded by default

  const faqData = [
    {
      question: "How does videoAI generate videos from text?",
      answer:
        "videoAI uses advanced AI models to convert your text input into realistic, on-demand, and interactive AI avatars and video clips. Enter your script, choose an avatar and voice, and our AI will generate a professional video in seconds.",
    },
    {
      question: "What AI models are available for video generation?",
      answer:
        "We support multiple cutting-edge AI models, including Veo3, Sora, Runway, HeyGen, D-ID, Synthesia, and Hedra. Each model offers unique capabilities for different video styles and use cases.",
    },
    {
      question: "Can I customize the AI avatars?",
      answer:
        "Yes! You can choose from our library of realistic AI avatars, including historical figures like William Shakespeare, Marcus Aurelius, and Thomas Aquinas. Each avatar has unique characteristics and voice options. As an educator, you can train them, allowing your students to chat with them. It's having life-like conversations with historical figures!",
    },
    {
      question: "What video formats can I export?",
      answer:
        "videoAI supports multiple export formats, including MP4, MOV, and WebM, with a maximum size of 100MB. You can choose different resolutions and quality settings based on your needs. Supported picture formats include JPG, GIF, and WEBP, with a maximum size of 10MB.",
    },
    {
      question: "Can I use videoAI for commercial purposes?",
      answer:
        "Yes, videos generated with videoAI can be used for commercial purposes, including education, marketing, social media, and business presentations.",
    },
    {
      question: "Is there a free version of videoAI?",
      answer:
        "Yes! We offer a free tier that includes basic video generation capabilities. Premium plans unlock additional features, more AI models, and higher-quality exports.",
    },
    {
      question: "Can I edit the generated videos?",
      answer:
        "Currently, videoAI focuses on generating complete videos from text. For editing, you can download your videos and use external video editing software.",
    },
    {
      question: "What languages are supported?",
      answer:
        "videoAI supports multiple languages for both text input and voice generation. Our AI avatars can speak in various languages with natural pronunciation.",
    },
  ]

  // Toggle FAQ expansion
  const toggleFAQ = (index: number) => {
    setExpandedFAQ(expandedFAQ === index ? null : index)
  }

  return (
    <section id="faq-section" className="min-h-screen bg-white flex items-center justify-center py-16 px-4">
      <div className="max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="mb-16">
          <h1 className="text-5xl lg:text-6xl font-bold text-gray-600 mb-6">Frequently asked questions</h1>
        </div>

        {/* FAQ Content - Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left Column - FAQ Items */}
          <div className="bg-[#F5F7FE] border border-[#E2EBFE] rounded-lg overflow-hidden">
            {faqData.map((faq, index) => (
              <div key={index}>
                <div
                  className="p-6 cursor-pointer transition-all duration-200 hover:bg-[#EEF2FD]"
                  onClick={() => toggleFAQ(index)}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-gray-600 font-medium text-base pr-4">{faq.question}</h3>
                    <div className="flex-shrink-0">
                      {expandedFAQ === index ? (
                        <Minus className="w-5 h-5 text-[#0078FF]" />
                      ) : (
                        <Plus className="w-5 h-5 text-[#0078FF]" />
                      )}
                    </div>
                  </div>
                  {expandedFAQ === index && (
                    <div className="mt-4 text-gray-600 text-sm leading-relaxed">{faq.answer}</div>
                  )}
                </div>
                {index < faqData.length - 1 && <div className="border-b border-[#E2EBFE]"></div>}
              </div>
            ))}
          </div>

          {/* Right Column - Contact Form */}
          <div className="space-y-6 border border-gray-200 rounded-lg p-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-600 mb-2">Still have questions?</h2>
              <p className="text-gray-600 text-sm">
                Fill out the form below and our team will get back to you as soon as possible.
              </p>
            </div>

            <form className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <Input
                  type="email"
                  id="email"
                  placeholder="Enter your email"
                  className="w-full h-10 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <Input
                  type="text"
                  id="subject"
                  placeholder="Enter your subject"
                  className="w-full h-10 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <Textarea
                  id="description"
                  rows={4}
                  className="w-full border border-gray-300 rounded-md resize-none"
                  placeholder="Please provide all relevant details, include steps to reproduce or screenshots of the issue if important"
                />
              </div>

              <div>
                <label htmlFor="impact" className="block text-sm font-medium text-gray-700 mb-1">
                  How does this issue limit your use of videoAI?
                </label>
                <Select>
                  <SelectTrigger className="w-full h-10 border border-gray-300 rounded-md">
                    <SelectValue placeholder="Please Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical - Cannot use the platform</SelectItem>
                    <SelectItem value="high">High - Significantly impacts usage</SelectItem>
                    <SelectItem value="medium">Medium - Some impact on usage</SelectItem>
                    <SelectItem value="low">Low - Minor inconvenience</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-1">
                  Upload a Screenshot or File
                </label>
                <div className="flex items-center gap-2">
                  <input type="file" id="file" className="hidden" />
                  <label
                    htmlFor="file"
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                  >
                    Choose File
                  </label>
                  <span className="text-sm text-gray-500">No file chosen</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button className="bg-[#38A1E5] hover:bg-[#2E91D5] text-white px-6 py-2 rounded-md">Submit</Button>
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-20 -mx-4">
          <div className="border-t border-gray-200 pt-8 px-4">
            <div className="flex items-center justify-center text-sm text-[#3E6BAD]">
              <span className="flex items-center">
                Powered by
                <Image
                  src="/images/design-mode/iblai-logo.png"
                  alt="IBL AI"
                  width={43}
                  height={19}
                  className="h-5 w-auto mx-2"
                  style={{ marginBottom: "0.45rem" }}
                />
                in New York
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
