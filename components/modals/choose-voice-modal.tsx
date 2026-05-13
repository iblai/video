"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Search, Play, Pause, Mic } from "lucide-react"
import { Loader } from "@iblai/iblai-js/web-containers"
import { useHeygenVoices } from "@/hooks/use-heygen-voices"
import type { HeygenVoice } from "@/lib/heygen/rest"

export interface ChosenVoice {
  id: string
  name: string
  language?: string
  gender?: string
  preview_audio_url?: string | null
}

interface ChooseVoiceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectVoice: (voice: ChosenVoice) => void
  /**
   * Optional upstream filter forwarded to the voice list. Use when the
   * caller needs to restrict voices to a specific engine (e.g. `starfish`
   * for `/v3/voices/speech`).
   */
  filter?: { engine?: string; language?: string; gender?: "male" | "female" }
}

function voiceToChosen(v: HeygenVoice): ChosenVoice {
  return {
    id: v.voice_id,
    name: v.name,
    language: v.language,
    gender: v.gender,
    preview_audio_url: v.preview_audio_url ?? null,
  }
}

export function ChooseVoiceModal({ open, onOpenChange, onSelectVoice, filter }: ChooseVoiceModalProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"public" | "private">("public")
  const [searchQuery, setSearchQuery] = useState("")
  const [playingVoice, setPlayingVoice] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const { voices, loading, loadingMore, error, loadMore, hasMore } = useHeygenVoices({
    type: activeTab,
    pageSize: 50,
    filter,
  })

  const filteredVoices = useMemo(() => {
    if (!searchQuery.trim()) return voices
    const q = searchQuery.toLowerCase()
    return voices.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        (v.language ?? "").toLowerCase().includes(q) ||
        (v.gender ?? "").toLowerCase().includes(q),
    )
  }, [voices, searchQuery])

  // Stop any active preview when the modal closes or the tab switches.
  useEffect(() => {
    if (!open && audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
      setPlayingVoice(null)
    }
  }, [open])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setPlayingVoice(null)
  }, [activeTab])

  const handlePlayVoice = (voice: HeygenVoice) => {
    const url = voice.preview_audio_url
    if (playingVoice === voice.voice_id) {
      audioRef.current?.pause()
      audioRef.current = null
      setPlayingVoice(null)
      return
    }
    audioRef.current?.pause()
    audioRef.current = null

    if (!url) return
    const audio = new Audio(url)
    audioRef.current = audio
    audio.onended = () => {
      audioRef.current = null
      setPlayingVoice(null)
    }
    audio.onerror = () => {
      console.warn("[choose-voice] preview playback failed", url)
      audioRef.current = null
      setPlayingVoice(null)
    }
    audio.play().catch((err) => {
      console.warn("[choose-voice] preview play rejected", err)
      audioRef.current = null
      setPlayingVoice(null)
    })
    setPlayingVoice(voice.voice_id)
  }

  const handleSelect = (voice: HeygenVoice) => {
    audioRef.current?.pause()
    audioRef.current = null
    setPlayingVoice(null)
    onSelectVoice(voiceToChosen(voice))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden p-0">
        <DialogTitle className="sr-only">Choose Voice</DialogTitle>
        <div className="shrink-0 p-6 pb-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-600">Choose Voice</h2>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2 bg-transparent"
              onClick={() => {
                onOpenChange(false)
                router.push("/voices/create")
              }}
            >
              <Mic className="w-4 h-4" />
              Create New Voice
            </Button>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="flex">
              <button
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "private"
                    ? "text-blue-500 border-blue-500"
                    : "text-gray-500 border-transparent hover:text-gray-700"
                }`}
                onClick={() => setActiveTab("private")}
              >
                My Voices
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "public"
                    ? "text-blue-500 border-blue-500"
                    : "text-gray-500 border-transparent hover:text-gray-700"
                }`}
                onClick={() => setActiveTab("public")}
              >
                Public Voices
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search voices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-6">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader />
            </div>
          )}

          {!loading && error && voices.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-red-600 mb-2 font-medium">Failed to load voices</p>
              <p className="text-gray-500 text-sm">{error}</p>
            </div>
          )}

          {!loading && !error && filteredVoices.length === 0 && (
            <div className="flex items-center justify-center py-16">
              <p className="text-gray-500 text-sm">
                {activeTab === "private"
                  ? "You haven't cloned any voices yet."
                  : "No voices match your search."}
              </p>
            </div>
          )}

          {!loading && filteredVoices.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              {filteredVoices.map((voice) => {
                const description = [voice.language, voice.gender]
                  .filter(Boolean)
                  .join(" • ")
                const isPlaying = playingVoice === voice.voice_id
                return (
                  <div
                    key={voice.voice_id}
                    className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors"
                    onClick={() => handleSelect(voice)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-600 truncate pr-2">
                        {voice.name}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 flex-shrink-0"
                        disabled={!voice.preview_audio_url}
                        onClick={(e) => {
                          e.stopPropagation()
                          handlePlayVoice(voice)
                        }}
                      >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </Button>
                    </div>
                    {description && (
                      <p className="text-sm text-gray-600">{description}</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {hasMore && !loading && (
            <div className="flex justify-center pt-6">
              <Button
                variant="outline"
                onClick={loadMore}
                disabled={loadingMore}
                className="min-w-[160px]"
              >
                {loadingMore ? "Loading..." : "Load more"}
              </Button>
            </div>
          )}

          {error && voices.length > 0 && (
            <p className="text-center text-red-600 text-sm pt-4">{error}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
