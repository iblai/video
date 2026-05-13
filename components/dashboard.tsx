"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ChevronRight, FileText } from "lucide-react"
import Image from "next/image"

const modelChips = [
  { id: "veo3", label: "Veo 3", icon: "/images/models/veo3.png", active: true },
  { id: "sora", label: "Sora", icon: "/images/models/sora.png" },
  { id: "runway", label: "Runway", icon: "/images/models/runway.png" },
  { id: "invideo", label: "Invideo", icon: "/images/models/invideo.png" },
  { id: "hedra", label: "Hedra", icon: "/images/models/hedra.png" },
]

const newModels = [
  {
    id: "o3",
    title: "o3",
    description: "OpenAI's newest reasoning model with coding, and...",
    gradient: "from-purple-600 to-blue-600",
    icon: "🧠",
  },
  {
    id: "kimi-k2",
    title: "Kimi K2",
    description: "Moonshot's latest model, excels at coding and mat...",
    gradient: "from-gray-800 to-gray-600",
    icon: "🌙",
  },
  {
    id: "grok4",
    title: "Grok 4",
    description: "xAI's latest inference model with enhanced...",
    gradient: "from-gray-700 to-black",
    icon: "⚡",
  },
  {
    id: "wan",
    title: "Wan",
    description: "Alibaba's video model, skilled at simulating...",
    gradient: "from-red-600 to-purple-600",
    icon: "🎬",
  },
  {
    id: "flux",
    title: "Flux",
    description: "Advanced image generation model with...",
    gradient: "from-blue-400 to-cyan-400",
    icon: "🎨",
  },
]

export function Dashboard() {
  const [selectedModel, setSelectedModel] = useState("veo3")
  const [prompt, setPrompt] = useState("")

  return (
    <div className="flex flex-col min-h-full">
      <div className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {/* Model Selection Chips */}
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          {modelChips.map((chip) => (
            <Button
              key={chip.id}
              variant="outline"
              className={`rounded-lg px-4 py-3 border transition-all duration-200 ${
                selectedModel === chip.id
                  ? "bg-videoai-accent border-videoai-primary text-videoai-primary shadow-sm"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400"
              }`}
              onClick={() => setSelectedModel(chip.id)}
            >
              <div className="w-5 h-5 mr-3">
                <Image
                  src={chip.icon || "/placeholder.svg"}
                  alt={chip.label}
                  width={20}
                  height={20}
                  className="w-full h-full object-contain"
                />
              </div>
              {chip.label}
            </Button>
          ))}
        </div>

        {/* Main Generation Area */}
        <Card className="mb-8 shadow-sm">
          <CardContent className="p-6">
            {/* Model Info */}
            <div className="flex items-center gap-2 mb-4">
              <span className="font-medium text-videoai-text">
                {modelChips.find((m) => m.id === selectedModel)?.label}:
              </span>
              <Badge className="bg-orange-500 hover:bg-orange-600 text-white">New</Badge>
              <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">Unlimited only</Badge>
              <Badge variant="outline" className="border-gray-300 text-gray-600">
                Text-to-Video
              </Badge>
              <Badge variant="outline" className="border-gray-300 text-gray-600">
                Google
              </Badge>
            </div>

            {/* Prompt Input */}
            <Textarea
              placeholder="Describe what you'd like to generate or go to the generation settings..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[100px] mb-4 border-gray-200 focus:border-videoai-primary resize-none"
            />

            {/* Bottom Actions */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-gray-600">
                <FileText className="h-4 w-4" />
                <span className="text-sm">My Prompts</span>
              </div>
              <Button variant="ghost" className="text-videoai-primary hover:bg-videoai-accent">
                Go To Setting
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Newly Released Models */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-videoai-text mb-6">Newly Released AI Models & Features</h2>

          <div className="flex gap-6 overflow-x-auto pb-4">
            {newModels.map((model) => (
              <Card
                key={model.id}
                className="flex-shrink-0 w-80 cursor-pointer hover:shadow-lg transition-shadow duration-200"
              >
                <CardContent className="p-0">
                  <div className="flex">
                    {/* Content */}
                    <div className="flex-1 p-6">
                      <h3 className="font-bold text-lg text-videoai-text mb-2">{model.title}</h3>
                      <p className="text-gray-600 text-sm leading-relaxed">{model.description}</p>
                    </div>

                    {/* Gradient Icon Area */}
                    <div
                      className={`w-24 bg-gradient-to-br ${model.gradient} flex items-center justify-center rounded-r-lg`}
                    >
                      <div className="text-white text-3xl">{model.icon}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-videoai-stroke bg-white">
        <div className="flex justify-between items-center text-xs text-gray-500 px-4 py-4">
          <div className="flex gap-6">
            <a href="#" className="hover:text-videoai-primary transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-videoai-primary transition-colors">
              Terms & Conditions
            </a>
          </div>
          <div className="text-gray-400">
            Powered by <span className="text-videoai-primary">ibl.ai</span> © 2025 ibl.ai
          </div>
        </div>
      </footer>
    </div>
  )
}
