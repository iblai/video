"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sparkles, Play, Pause, Clock3, Upload, LinkIcon, ChevronRight, Mic, FileText, Loader2 } from 'lucide-react'
import { RichTextEditor } from "@iblai/iblai-js/web-containers"
import { ConversationStarters } from "@iblai/iblai-js/web-containers/next"
import { ChooseVoiceModal, type ChosenVoice } from "@/components/modals/choose-voice-modal"
import { generateHeygenSpeech, listHeygenVoicesPage } from "@/lib/heygen/rest"
import { extractTextFromFile } from "@/lib/scripts/extract-text"
import { openaiProxyAuthHeaders, openaiProxyUrl } from "@/lib/openai/proxy"

type TabKey = "text" | "audio" | "files"

export default function AddScriptPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("text")
  const [script, setScript] = useState("")
  const [speed, setSpeed] = useState<number[]>([1])
  const [isDragOver, setIsDragOver] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)

  // AI Help dialog
  const [aiOpen, setAiOpen] = useState(false)
  const [aiPrompt, setAiPrompt] = useState(
    "Photosynthesis for Grade 7 biology class (10-minute explanation with examples)"
  )
  const [isGenerating, setIsGenerating] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  // HeyGen TTS state
  const [selectedVoice, setSelectedVoice] = useState<ChosenVoice | null>(null)
  const [voiceModalOpen, setVoiceModalOpen] = useState(false)
  const [isSynthesizing, setIsSynthesizing] = useState(false)
  const [playbackError, setPlaybackError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioUrlRef = useRef<string | null>(null)
  const speechCacheRef = useRef<{ textKey: string; voiceId: string; speed: number; url: string } | null>(null)

  // Audio-tab transcription (OpenAI Whisper)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcribeError, setTranscribeError] = useState<string | null>(null)

  // Files-tab document extraction
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractError, setExtractError] = useState<string | null>(null)

  const charLimit = 3875
  const plainText = useMemo(() => {
    if (typeof document === "undefined") return script
    const tmp = document.createElement("div")
    tmp.innerHTML = script
    return tmp.textContent || tmp.innerText || ""
  }, [script])
  const charCount = plainText.length
  const remaining = useMemo(() => Math.max(0, charLimit - charCount), [charCount])

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-pick the first public voice so the Play button works out of the box.
  useEffect(() => {
    if (selectedVoice) return
    let cancelled = false
    ;(async () => {
      try {
        const page = await listHeygenVoicesPage({ type: "public", engine: "starfish", limit: 1 })
        const first = page.data?.[0]
        if (cancelled || !first) return
        setSelectedVoice({
          id: first.voice_id,
          name: first.name,
          language: first.language,
          gender: first.gender,
          preview_audio_url: first.preview_audio_url ?? null,
        })
      } catch (err) {
        console.warn("[scripts/add] default voice load failed:", err)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selectedVoice])

  // Clean up any audio element + object URL on unmount.
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    setIsPlaying(false)
  }

  const handlePlayPause = async () => {
    if (isSynthesizing) return
    const text = plainText.trim()
    if (!text) {
      setPlaybackError("Please type or generate a script first.")
      return
    }
    if (text.length > charLimit) {
      setPlaybackError(
        `Script is ${text.length.toLocaleString()} characters; max is ${charLimit.toLocaleString()}.`,
      )
      return
    }
    if (!selectedVoice) {
      setPlaybackError("Please pick a voice first.")
      return
    }

    // Toggle pause/resume if we already have audio.
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
        return
      }
      audioRef.current.play().then(
        () => setIsPlaying(true),
        () => setIsPlaying(false),
      )
      return
    }

    setPlaybackError(null)
    const currentSpeed = speed[0] || 1
    const cacheKey = { textKey: text, voiceId: selectedVoice.id, speed: currentSpeed }
    const cached = speechCacheRef.current
    let audioUrl: string | null =
      cached &&
      cached.textKey === cacheKey.textKey &&
      cached.voiceId === cacheKey.voiceId &&
      cached.speed === cacheKey.speed
        ? cached.url
        : null

    if (!audioUrl) {
      setIsSynthesizing(true)
      try {
        const res = await generateHeygenSpeech({
          text,
          voice_id: selectedVoice.id,
          speed: currentSpeed,
        })
        audioUrl = res.audio_url
        speechCacheRef.current = { ...cacheKey, url: audioUrl }
      } catch (err) {
        console.error("[scripts/add] TTS failed:", err)
        setPlaybackError((err as Error)?.message ?? "Failed to generate speech.")
        return
      } finally {
        setIsSynthesizing(false)
      }
    }

    const audio = new Audio(audioUrl)
    audio.onended = () => {
      setIsPlaying(false)
      audioRef.current = null
    }
    audio.onerror = () => {
      setIsPlaying(false)
      audioRef.current = null
      setPlaybackError("Failed to play audio.")
    }
    audioRef.current = audio
    audioUrlRef.current = audioUrl
    try {
      await audio.play()
      setIsPlaying(true)
    } catch (err) {
      // AbortError fires when pause() interrupts a pending play() promise —
      // e.g. the user tweaks the script/voice/speed mid-playback and our
      // invalidation effect stops the audio. Nothing actionable for the
      // user, so swallow it.
      if ((err as Error)?.name === "AbortError") return
      audioRef.current = null
      setPlaybackError((err as Error)?.message ?? "Failed to play audio.")
    }
  }

  // Invalidate cached audio + stop playback when script/voice/speed change.
  useEffect(() => {
    speechCacheRef.current = null
    stopPlayback()
    audioRef.current = null
  }, [plainText, selectedVoice?.id, speed])

  const handleSpeedChange = (val: number[]) => {
    setSpeed(val)
  }

  const handleUploadClick = () => fileInputRef.current?.click()

  const transcribeAudioFile = async (file: File) => {
    setTranscribeError(null)
    setIsTranscribing(true)
    try {
      const body = new FormData()
      body.append("file", file)
      body.append("model", "whisper-1")
      body.append("response_format", "text")
      const res = await fetch(openaiProxyUrl("v1/audio/transcriptions"), {
        method: "POST",
        headers: openaiProxyAuthHeaders(),
        body,
      })
      if (!res.ok) {
        const detail = await res.text().catch(() => "")
        throw new Error(`Whisper ${res.status}: ${detail || res.statusText}`)
      }
      const text = (await res.text()).trim()
      if (!text) throw new Error("Whisper returned an empty transcript.")
      setScript(plainTextToHtml(text))
      setActiveTab("text")
    } catch (err) {
      console.error("[scripts/add] transcription failed:", err)
      setTranscribeError((err as Error)?.message ?? "Failed to transcribe audio.")
    } finally {
      setIsTranscribing(false)
    }
  }

  const handleAudioDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith("audio/")) {
      transcribeAudioFile(file)
    } else if (file) {
      setTranscribeError("Please drop an audio file.")
    }
  }

  const extractFromDocument = async (file: File) => {
    setExtractError(null)
    setIsExtracting(true)
    try {
      const text = (await extractTextFromFile(file)).trim()
      if (!text) throw new Error("The file contained no extractable text.")
      setScript(plainTextToHtml(text))
      setActiveTab("text")
    } catch (err) {
      console.error("[scripts/add] file extraction failed:", err)
      setExtractError((err as Error)?.message ?? "Failed to extract text.")
    } finally {
      setIsExtracting(false)
    }
  }

  const handleFilesDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) extractFromDocument(file)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (activeTab === "audio") transcribeAudioFile(file)
      else if (activeTab === "files") extractFromDocument(file)
    }
    // Reset so picking the same file twice still triggers onChange.
    e.target.value = ""
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleGenerateFromAI = async () => {
    const topic = aiPrompt?.trim()
    if (!topic) {
      setAiError("Please describe the lesson or topic first.")
      return
    }
    setIsGenerating(true)
    setAiError(null)
    try {
      const res = await fetch(openaiProxyUrl("v1/chat/completions"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...openaiProxyAuthHeaders(),
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.7,
          messages: [
            {
              role: "system",
              content:
                "You write spoken scripts for an AI video avatar presenting a lesson. Return only the script itself — no stage directions, section headers, markdown, or preamble. Write in natural, conversational prose the avatar will read aloud. Use short paragraphs separated by a blank line. Keep it engaging, clear, and age-appropriate to the request. Aim for 300–500 words unless the prompt specifies otherwise.",
            },
            {
              role: "user",
              content: `Write a script for this lesson:\n\n${topic}`,
            },
          ],
        }),
      })
      if (!res.ok) {
        const detail = await res.text().catch(() => "")
        throw new Error(`OpenAI ${res.status}: ${detail || res.statusText}`)
      }
      const json = await res.json()
      const text: string = json?.choices?.[0]?.message?.content?.trim() ?? ""
      if (!text) throw new Error("OpenAI returned an empty response.")
      setScript(plainTextToHtml(text))
      setAiOpen(false)
    } catch (err) {
      console.error("[scripts/add] AI generate failed:", err)
      setAiError((err as Error)?.message ?? "Failed to generate script.")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="min-h-full bg-white">
      <div className="px-6 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-[#4E5460]">Create Script</h1>
      </div>

      <div className="px-6 pb-6 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_520px] gap-6">
        {/* Left Column */}
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-0">
            {/* Tabs */}
            <div className="px-5 pt-5">
              <div className="flex items-center gap-10 border-b border-gray-200">
                <TabButton label="Text" active={activeTab === "text"} onClick={() => setActiveTab("text")} />
                <TabButton label="Audio" active={activeTab === "audio"} onClick={() => setActiveTab("audio")} />
                <TabButton label="Files" active={activeTab === "files"} onClick={() => setActiveTab("files")} />
              </div>
            </div>

            {/* Content */}
            <div className="px-5 pt-4">
              {activeTab === "text" && (
                <div className="relative">
                  <RichTextEditor
                    value={script}
                    onChange={(val) => setScript(val)}
                    exportFormat="html"
                    placeholder="Type your script"
                    minHeight="500px"
                  />

                  {/* Controls bar below editor */}
                  <div className="flex items-center justify-between rounded-b-md border border-t-0 border-gray-300 bg-gray-50 px-3 py-2">
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label={isPlaying ? "Pause" : "Play"}
                        className="h-8 w-8 rounded-full"
                        onClick={handlePlayPause}
                        disabled={isSynthesizing}
                      >
                        {isSynthesizing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : isPlaying ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setAiOpen(true)}
                        className="bg-[#E6EDFC] text-[#0376C1] hover:bg-[#d9e6fb]"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        AI Help
                      </Button>
                    </div>
                    <div
                      className={`flex items-center gap-2 text-xs ${
                        charCount > charLimit ? "text-red-600 font-medium" : "text-gray-600"
                      }`}
                    >
                      <Clock3 className="w-4 h-4" />
                      <span>{`${charCount.toLocaleString()}/${charLimit.toLocaleString()} Characters`}</span>
                    </div>
                  </div>
                  {playbackError && (
                    <p className="mt-2 text-sm text-red-600">{playbackError}</p>
                  )}
                </div>
              )}

              {activeTab === "audio" && (
                <div className="space-y-3">
                  <Dropzone
                    icon={
                      isTranscribing ? (
                        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                      ) : (
                        <Mic className="w-6 h-6 text-gray-400" />
                      )
                    }
                    title={
                      isTranscribing
                        ? "Transcribing audio with Whisper…"
                        : "Drag & drop an audio file or upload one — it will be transcribed to your script"
                    }
                    isDragOver={isDragOver}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={handleAudioDrop}
                    onUploadClick={handleUploadClick}
                    disabled={isTranscribing}
                  />
                  <p className="text-xs text-gray-500">
                    Supported formats: MP3, WAV, M4A, WEBM, OGG. Max size: 25MB.
                  </p>
                  {transcribeError && (
                    <p className="text-sm text-red-600">{transcribeError}</p>
                  )}
                </div>
              )}

              {activeTab === "files" && (
                <div className="space-y-3">
                  <Dropzone
                    icon={
                      isExtracting ? (
                        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                      ) : (
                        <FileText className="w-6 h-6 text-gray-400" />
                      )
                    }
                    title={
                      isExtracting
                        ? "Extracting text from document…"
                        : "Drag & drop a lesson or presentation — the text will seed your script"
                    }
                    isDragOver={isDragOver}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={handleFilesDrop}
                    onUploadClick={handleUploadClick}
                    disabled={isExtracting}
                  />
                  <p className="text-xs text-gray-500">Supported formats: DOCX, PPTX, TXT, PDF. Max size: 20MB.</p>
                  {extractError && (
                    <p className="text-sm text-red-600">{extractError}</p>
                  )}
                </div>
              )}

              {/* Hidden input for uploads */}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept={
                  activeTab === "audio"
                    ? "audio/*"
                    : activeTab === "files"
                      ? ".txt,.docx,.pdf,.pptx,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                      : undefined
                }
                onChange={handleFileInputChange}
              />

              {/* Voice row */}
              <div className="mt-4">
                <button
                  type="button"
                  className="w-full rounded-md border border-[#E6EDFC] bg-[#E6EDFC] text-[#4E5460] px-4 py-3 flex items-center justify-between hover:bg-[#d9e6fb] transition-colors"
                  onClick={() => setVoiceModalOpen(true)}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-white border border-gray-200 flex items-center justify-center">
                      <span className="text-sm font-medium">
                        {selectedVoice?.name?.[0] ?? "Aa"}
                      </span>
                    </div>
                    <div className="text-left">
                      <div className="font-medium">
                        {selectedVoice?.name ?? "Choose a voice"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {selectedVoice?.language ?? "Click to browse HeyGen voices"}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              {/* Speed row aligned */}
              <div className="mt-4 mb-5 flex items-center gap-4">
                <div className="text-sm text-gray-600 shrink-0">{`Speed(${(speed[0] || 1).toFixed(1)}x)`}</div>
                <div className="flex-1">
                  <Slider value={speed} onValueChange={handleSpeedChange} min={0.5} max={2} step={0.1} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Column (fixed width) */}
        <Card className="border border-gray-200 shadow-sm self-start">
          <CardContent className="p-0">
            <div className="p-6">
              <h2 className="text-lg font-bold text-[#4E5460] text-center">AI Script</h2>
              <p className="mt-2 text-center text-gray-600">
                By describing imagined text or audio reference, you can obtain the desired script.
              </p>

              <div
                className="mt-6 [&_.grid]:!grid-cols-1 [&_.grid]:!gap-4 [&_.p-4]:!p-6 [&_.text-sm]:!text-base [&_.text-sm]:!leading-7 [&_h2]:!mb-4 [&_.max-w-6xl]:!max-w-none [&_.px-4]:!px-0"
              >
                <ConversationStarters
                  guidedPrompts={[
                    { prompt: "Photosynthesis for Grade 7 biology class", icon: "leaf" },
                    { prompt: "Introduction to fractions for Grade 4 math", icon: "calculator" },
                    { prompt: "World War II overview for high school history", icon: "globe" },
                    { prompt: "Solar system exploration for Grade 5 science", icon: "sun" },
                    { prompt: "Creative writing workshop for middle school", icon: "pencil" },
                  ]}
                  onTemplateSelect={(prompt) => {
                    setAiPrompt(prompt)
                    setAiOpen(true)
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <ChooseVoiceModal
        open={voiceModalOpen}
        onOpenChange={setVoiceModalOpen}
        onSelectVoice={(v) => {
          setSelectedVoice(v)
          setVoiceModalOpen(false)
        }}
        filter={{ engine: "starfish" }}
      />

      {/* AI Help Dialog */}
      <Dialog
        open={aiOpen}
        onOpenChange={(open) => {
          if (isGenerating) return
          setAiOpen(open)
          if (!open) setAiError(null)
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#4E5460]">AI Help</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <label className="text-sm text-gray-600">Describe the lesson or topic</label>
            <Textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="e.g., Introduction to fractions for Grade 4 with real-life examples"
              className="min-h-[120px] resize-none"
              disabled={isGenerating}
            />
            {aiError && (
              <p className="text-sm text-red-600">{aiError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAiError(null)
                setAiOpen(false)
              }}
              disabled={isGenerating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerateFromAI}
              className="bg-[#0376C1] hover:bg-[#056fb4] text-white"
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative -mb-px pb-3 pt-2 text-sm font-medium transition-colors ${
        active ? "text-[#0376C1]" : "text-gray-500 hover:text-gray-700"
      }`}
    >
      {label}
      <span className={`absolute bottom-0 left-0 h-0.5 w-full rounded ${active ? "bg-[#0376C1]" : "bg-transparent"}`} />
    </button>
  )
}

function Dropzone({
  icon,
  title,
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onUploadClick,
  disabled,
}: {
  icon: React.ReactNode
  title: string
  isDragOver: boolean
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onUploadClick: () => void
  disabled?: boolean
}) {
  return (
    <div
      className={`rounded-lg border-2 border-dashed p-10 text-center transition-colors ${
        isDragOver ? "border-[#0376C1] bg-blue-50" : "border-gray-300"
      } ${disabled ? "opacity-60 pointer-events-none" : ""}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      role="button"
      tabIndex={0}
    >
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-gray-400">
        {icon}
      </div>
      <p className="text-gray-600 mb-4">{title}</p>
      <div className="flex items-center justify-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation()
            onUploadClick()
          }}
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload File
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation()
          }}
        >
          <LinkIcon className="w-4 h-4 mr-2" />
          Enter URL
        </Button>
      </div>
    </div>
  )
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

function plainTextToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((para) =>
      `<p>${escapeHtml(para.trim()).replace(/\n/g, "<br />")}</p>`,
    )
    .join("")
}
