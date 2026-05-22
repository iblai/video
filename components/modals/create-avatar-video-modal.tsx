"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Sparkles, Play, Pause, Maximize, Minimize, RectangleHorizontal, RectangleVertical } from "lucide-react"
import Image from "@/components/iblai/base-image"
import { ChooseVoiceModal, type ChosenVoice } from "./choose-voice-modal"
import { RecordAudioModal } from "./record-audio-modal"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  createHeygenVideo,
  getHeygenVideoStatus,
  resolveHeygenLookId,
  type HeygenVideoAspectRatio,
  type HeygenVideoResolution,
} from "@/lib/heygen/rest"
import {
  createHeygenPrivateVideoResource,
  publishVideoToMainTenant,
  type VideoVisibility,
} from "@/lib/iblai/catalog"
import { resolveAppTenant } from "@/lib/iblai/tenant"

interface CreateAvatarVideoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  avatar: {
    id: string
    name: string
    image: string
    /** If absent, the user must pick a voice before generating a video. */
    default_voice_id?: string
  } | null
}

const models = [
  { id: "heygen", name: "HeyGen", icon: "/images/models/heygen.png" },
]

export function CreateAvatarVideoModal({ open, onOpenChange, avatar }: CreateAvatarVideoModalProps) {
  const router = useRouter()
  const [script, setScript] = useState("")
  const [selectedVoice, setSelectedVoice] = useState<{ id: string; name: string } | null>(null)
  const [selectedModel, setSelectedModel] = useState<string>("heygen")
  const [resolution, setResolution] = useState<HeygenVideoResolution>("720p")
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [voiceModalOpen, setVoiceModalOpen] = useState(false)
  const [recordModalOpen, setRecordModalOpen] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)

  const [imageMode, setImageMode] = useState<"cover" | "contain">("cover")
  const [orientation, setOrientation] = useState<"landscape" | "portrait">("landscape")
  const [visibility, setVisibility] = useState<VideoVisibility>("platform")

  const charLimit = 840
  const charCount = script.length
  const estimatedSeconds = Math.ceil(charCount / 180) // Rough estimate: 180 chars per second

  const voiceRequired = !avatar?.default_voice_id
  const missingVoice = voiceRequired && !selectedVoice?.id
  const canGenerate =
    !!script.trim() && !isGenerating && !missingVoice

  const handleSurpriseMe = () => {
    const sampleScripts = [
      "Welcome to our innovative platform! Today, I'm excited to share how our cutting-edge technology can transform your business operations and drive unprecedented growth.",
      "Hello everyone! Let me introduce you to the future of digital communication. Our AI-powered solutions are designed to enhance productivity and streamline workflows.",
      "Greetings! I'm here to demonstrate how our revolutionary approach to data analytics can provide actionable insights that will elevate your decision-making process.",
    ]
    const randomScript = sampleScripts[Math.floor(Math.random() * sampleScripts.length)]
    setScript(randomScript)
  }

  const handleVoiceSelect = (voice: ChosenVoice) => {
    setSelectedVoice({ id: voice.id, name: voice.name })
    setVoiceModalOpen(false)
  }

  const handlePlay = () => {
    if (!script.trim()) return

    setIsPlaying(!isPlaying)

    if (!isPlaying && "speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(script)
      utterance.onend = () => setIsPlaying(false)
      speechSynthesis.speak(utterance)
    } else {
      speechSynthesis.cancel()
    }
  }

  const handleUploadOrRecord = () => {
    setRecordModalOpen(true)
  }

  const handleRecordComplete = (audioData: any) => {
    // Handle the recorded audio data
    console.log("Audio recorded:", audioData)
  }

  const setCoverMode = () => setImageMode("cover")
  const setContainMode = () => setImageMode("contain")
  const setLandscapeMode = () => setOrientation("landscape")
  const setPortraitMode = () => setOrientation("portrait")

  const handleGenerateVideo = async () => {
    if (!script.trim() || !avatar) return
    if (isGenerating) return
    if (voiceRequired && !selectedVoice?.id) {
      setGenerateError("This avatar has no default voice — please choose a voice.")
      return
    }

    setGenerateError(null)
    setIsGenerating(true)

    const aspectRatio: HeygenVideoAspectRatio =
      orientation === "portrait" ? "9:16" : "16:9"
    const newVideoId = `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const title = `${avatar.name} Video - ${new Date().toLocaleDateString()}`

    try {
      if (selectedModel === "heygen") {
        const platform = resolveAppTenant()
        if (!platform) throw new Error("No tenant resolved — cannot register video")

        const voiceId = selectedVoice?.id ?? avatar.default_voice_id
        if (!voiceId) throw new Error("Missing voice_id for HeyGen video")

        // `avatar.id` is the HeyGen group_id (what the catalog stores).
        // `/v2/video/generate` wants a look_id. For photo avatars these
        // happen to coincide, but digital twins have separate ids, so
        // always resolve explicitly.
        const lookId = await resolveHeygenLookId(avatar.id)

        const { video_id: videoId } = await createHeygenVideo({
          avatar_id: lookId,
          voice_id: voiceId,
          script,
          aspect_ratio: aspectRatio,
          title,
        })

        await createHeygenPrivateVideoResource(platform, videoId, {
          name: title,
          image_url: avatar.image,
          visibility,
        })
        if (visibility === "public") {
          try {
            const detail = await getHeygenVideoStatus(videoId).catch(() => null)
            await publishVideoToMainTenant({
              videoId,
              title,
              videoUrl: detail?.video_url ?? "",
              imageUrl: detail?.thumbnail_url ?? avatar.image,
              duration: detail?.duration,
              createdAt: detail?.created_at,
              sourcePlatform: platform,
            })
          } catch (err) {
            console.warn("[create-avatar-video] publish-to-main failed:", err)
          }
        }

        onOpenChange(false)
        router.push("/videos/my")
        return
      }

      // Non-HeyGen models: keep the existing simulated flow for now.
      const newVideo = {
        id: newVideoId,
        title,
        thumbnail: avatar.image,
        videoUrl:
          "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/avatar_sample-y0npQ0SSHoneVkMxjpT78lfNJd6IDd.mp4",
        duration: `${estimatedSeconds}s`,
        createdAt: new Date().toLocaleDateString(),
        isGenerating: true,
        progress: 0,
        model: selectedModel,
      }

      const existingVideos = JSON.parse(localStorage.getItem("myVideoClips") || "[]")
      localStorage.setItem(
        "myVideoClips",
        JSON.stringify([newVideo, ...existingVideos]),
      )

      let progress = 0
      const progressInterval = setInterval(() => {
        progress += Math.random() * 15 + 5
        if (progress >= 100) {
          progress = 100
          clearInterval(progressInterval)
          const videos = JSON.parse(localStorage.getItem("myVideoClips") || "[]")
          localStorage.setItem(
            "myVideoClips",
            JSON.stringify(
              videos.map((v: any) =>
                v.id === newVideoId ? { ...v, isGenerating: false, progress: 100 } : v,
              ),
            ),
          )
        } else {
          const videos = JSON.parse(localStorage.getItem("myVideoClips") || "[]")
          localStorage.setItem(
            "myVideoClips",
            JSON.stringify(
              videos.map((v: any) =>
                v.id === newVideoId ? { ...v, progress: Math.round(progress) } : v,
              ),
            ),
          )
        }
      }, 800)

      onOpenChange(false)
      router.push("/videos/my")
    } catch (err) {
      console.error("Video generation failed:", err)
      setGenerateError((err as Error)?.message ?? "Video generation failed")
      setIsGenerating(false)
    }
  }

  if (!avatar) return null

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden p-0">
          <DialogTitle className="sr-only">Create Avatar Video</DialogTitle>
          <div className="p-6 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-600">On Demand AI Avatar</h2>
              </div>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Left Panel - Avatar */}
            <div className="w-80 p-6 pt-0">
              <div className="relative">
                <Image
                  src={avatar.image || "/placeholder.svg"}
                  alt={avatar.name}
                  width={320}
                  height={400}
                  className={`w-full rounded-lg transition-all duration-300 ${
                    imageMode === "cover" ? "object-cover" : "object-contain"
                  } ${orientation === "portrait" ? "aspect-[3/4]" : "aspect-[4/3]"}`}
                />

                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 flex gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 shadow-md border border-gray-200 bg-white hover:bg-gray-50"
                        onClick={setCoverMode}
                      >
                        <Maximize className={`h-4 w-4 ${imageMode === "cover" ? "text-blue-500" : "text-gray-600"}`} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Cover</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 shadow-md border border-gray-200 bg-white hover:bg-gray-50"
                        onClick={setContainMode}
                      >
                        <Minimize
                          className={`h-4 w-4 ${imageMode === "contain" ? "text-blue-500" : "text-gray-600"}`}
                        />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Contain</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 shadow-md border border-gray-200 bg-white hover:bg-gray-50"
                        onClick={setLandscapeMode}
                      >
                        <RectangleHorizontal
                          className={`h-4 w-4 ${orientation === "landscape" ? "text-blue-500" : "text-gray-600"}`}
                        />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Landscape</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 shadow-md border border-gray-200 bg-white hover:bg-gray-50"
                        onClick={setPortraitMode}
                      >
                        <RectangleVertical
                          className={`h-4 w-4 ${orientation === "portrait" ? "text-blue-500" : "text-gray-600"}`}
                        />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Portrait</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>

            {/* Right Panel - Script */}
            <div className="flex-1 p-6 pt-0 border-l border-gray-200">
              {/* Model selection section */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-600 mb-3">
                  Choose Model <span className="text-red-500">*</span>
                </h3>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        <Image
                          src={models.find((m) => m.id === selectedModel)?.icon || "/placeholder.svg"}
                          alt={models.find((m) => m.id === selectedModel)?.name || ""}
                          width={20}
                          height={20}
                          className={`rounded ${
                            models.find((m) => m.id === selectedModel)?.id === "freepick" ? "bg-blue-500 p-1" : ""
                          }`}
                        />
                        {models.find((m) => m.id === selectedModel)?.name}
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        <div className="flex items-center gap-2">
                          <Image
                            src={model.icon || "/placeholder.svg"}
                            alt={model.name}
                            width={20}
                            height={20}
                            className={`rounded ${model.id === "freepick" ? "bg-blue-500 p-1" : ""}`}
                          />
                          {model.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-600">
                  Add a Script <span className="text-red-500">*</span>
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSurpriseMe}
                  className="text-blue-500 hover:text-blue-600"
                >
                  <Sparkles className="w-4 h-4 mr-1" />
                  Surprise me
                </Button>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <Textarea
                    placeholder=""
                    value={script}
                    onChange={(e) => setScript(e.target.value)}
                    className="min-h-[200px] resize-none pr-32 pb-12"
                  />

                  {/* Single placeholder with upload or record audio link */}
                  {!script && (
                    <div className="absolute top-3 left-3 text-gray-500 pointer-events-none">
                      Type your script here, or{" "}
                      <button
                        className="text-blue-500 hover:underline pointer-events-auto"
                        onClick={handleUploadOrRecord}
                      >
                        Upload or Record Audio
                      </button>
                    </div>
                  )}

                  {/* Choose Voice and Play buttons - bottom right inside textarea */}
                  <div className="absolute bottom-3 right-3 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setVoiceModalOpen(true)}
                      className={`flex items-center gap-1 h-8 text-xs border-0 bg-transparent hover:bg-gray-50 ${
                        missingVoice ? "text-red-600" : ""
                      }`}
                    >
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <line x1="12" y1="19" x2="12" y2="23" />
                        <line x1="8" y1="23" x2="16" y2="23" />
                      </svg>
                      {selectedVoice?.name || (voiceRequired ? "Choose Voice *" : "Choose Voice")}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-full bg-[#D0E0FF] border-0 hover:bg-[#C5D6F7]"
                      onClick={handlePlay}
                      disabled={!script.trim()}
                    >
                      {isPlaying ? (
                        <Pause className="w-3 h-3 text-[#4A83C2]" />
                      ) : (
                        <Play className="w-3 h-3 text-[#4A83C2]" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>
                    {charCount}/{charLimit} (1min max) • {estimatedSeconds} seconds
                  </span>
                  <span></span>
                </div>

                <div className="flex items-center justify-between">
                  <Select
                    value={resolution}
                    onValueChange={(v) => setResolution(v as HeygenVideoResolution)}
                  >
                    <SelectTrigger className="w-20 h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="720p">720p</SelectItem>
                      <SelectItem value="1080p">1080p</SelectItem>
                      <SelectItem value="4k">4K</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    className="bg-blue-500 hover:bg-blue-600 text-white px-6"
                    disabled={!canGenerate}
                    onClick={handleGenerateVideo}
                  >
                    {isGenerating ? "Generating..." : "Generate AI Avatar Video"}
                  </Button>
                </div>

                {missingVoice && !generateError && (
                  <p className="text-sm text-amber-600">
                    This avatar has no default voice — please choose one.
                  </p>
                )}

                {generateError && (
                  <p className="text-sm text-red-600">{generateError}</p>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ChooseVoiceModal open={voiceModalOpen} onOpenChange={setVoiceModalOpen} onSelectVoice={handleVoiceSelect} />

      <RecordAudioModal
        open={recordModalOpen}
        onOpenChange={setRecordModalOpen}
        onRecordComplete={handleRecordComplete}
      />
    </TooltipProvider>
  )
}
