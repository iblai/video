"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, Plus } from "lucide-react"
import Image from "@/components/iblai/base-image"
import { Loader } from "@iblai/iblai-js/web-containers"
import { CreateAvatarVideoModal } from "@/components/modals/create-avatar-video-modal"
import CharacterSelectionModal from "@/components/modals/character-selection-modal"
import { useHeygenAvatars } from "@/hooks/use-heygen-avatars"
import type { HeygenAvatar } from "@/lib/heygen/rest"

type MyAvatar = {
  id: string
  name: string
  image: string
  badge: string | null
  status?: string
  default_voice_id?: string
}

function mapHeygenMyAvatar(a: HeygenAvatar): MyAvatar {
  return {
    id: a.id,
    name: a.name || a.id,
    image: a.preview_image_url || "/placeholder.svg",
    badge: null,
    status: a.status,
    default_voice_id: a.default_voice_id,
  }
}

export default function MyAvatarsPage() {
  const router = useRouter()
  const [selectedAvatar, setSelectedAvatar] = useState<MyAvatar | null>(null)
  const [characterSelectionOpen, setCharacterSelectionOpen] = useState(false)
  const [videoModalOpen, setVideoModalOpen] = useState(false)
  const [localAvatars, setLocalAvatars] = useState<MyAvatar[]>([])
  const [overrides, setOverrides] = useState<Record<string, Partial<MyAvatar>>>({})

  const { avatars, loading, error, refetchGroup } = useHeygenAvatars()

  useEffect(() => {
    if (typeof window === "undefined") return
    const parsed = JSON.parse(localStorage.getItem("newCharacters") || "[]") as any[]
    setLocalAvatars(
      parsed.map((char) => ({
        id: char.id,
        name: char.name,
        image: char.image,
        badge: char.badge ?? "New",
      })),
    )
  }, [])

  // Keep a ref mirror of avatars so the polling interval reads the
  // current list without retriggering on every update.
  const avatarsRef = useRef<HeygenAvatar[]>([])
  useEffect(() => {
    avatarsRef.current = avatars
  }, [avatars])

  // Poll any avatar group that's still training every 10 s. HeyGen
  // flips `status` from "processing" to "completed"/"failed" when the
  // model is ready.
  useEffect(() => {
    const interval = setInterval(() => {
      const inFlight = avatarsRef.current.filter(
        (a) => a.status === "processing",
      )
      for (const a of inFlight) {
        void refetchGroup(a.id)
      }
    }, 10000)
    return () => clearInterval(interval)
  }, [refetchGroup])

  const allAvatars = useMemo<MyAvatar[]>(() => {
    const merged = [...localAvatars, ...avatars.map(mapHeygenMyAvatar)]
    return merged.map((a) => (overrides[a.id] ? { ...a, ...overrides[a.id] } : a))
  }, [avatars, localAvatars, overrides])

  const handleCreateNewAvatar = () => {
    router.push("/ai-avatar/generate")
  }

  const handleAvatarClick = (avatar: MyAvatar) => {
    if (avatar.status === "processing") return
    setSelectedAvatar(avatar)
    setCharacterSelectionOpen(true)
  }

  const handleCreateVideo = () => {
    setCharacterSelectionOpen(false)
    setVideoModalOpen(true)
  }

  const handleInteractiveChat = () => {
    setCharacterSelectionOpen(false)
    if (selectedAvatar) {
      router.push(`/ai-avatar/interactive/${selectedAvatar.id}`)
    }
  }

  const handleNameUpdate = (newName: string) => {
    if (!selectedAvatar) return

    setOverrides((prev) => ({
      ...prev,
      [selectedAvatar.id]: { ...prev[selectedAvatar.id], name: newName },
    }))
    setSelectedAvatar({ ...selectedAvatar, name: newName })

    const newCharacters = JSON.parse(localStorage.getItem("newCharacters") || "[]")
    const updatedNewCharacters = newCharacters.map((char: any) =>
      char.id === selectedAvatar.id ? { ...char, name: newName } : char,
    )
    localStorage.setItem("newCharacters", JSON.stringify(updatedNewCharacters))
    setLocalAvatars((prev) =>
      prev.map((a) => (a.id === selectedAvatar.id ? { ...a, name: newName } : a)),
    )
  }

  return (
    <div className="p-6 bg-white min-h-full">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#4E5460] mb-2">My AI Avatars</h1>
        <p className="text-lg text-[#4E5460] font-medium">
          Choose a AI avatar, add a script, and get a studio quality AI avatar video in minutes.
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-24">
          <Loader />
        </div>
      )}

      {!loading && error && allAvatars.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-red-600 mb-2 font-medium">Failed to load avatars</p>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      )}

      {!loading && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {allAvatars.map((avatar) => {
              const isProcessing = avatar.status === "processing"
              const isFailed = avatar.status === "failed"
              return (
                <Card
                  key={avatar.id}
                  className={`transition-shadow duration-200 border border-[#D0E0FF] bg-[#F5F8FF] group ${
                    isProcessing ? "opacity-75 cursor-wait" : "cursor-pointer hover:shadow-lg"
                  }`}
                  onClick={() => handleAvatarClick(avatar)}
                >
                  <CardContent className="p-0">
                    <div className="relative aspect-square rounded-lg overflow-hidden">
                      <Image
                        src={avatar.image || "/placeholder.svg"}
                        alt={avatar.name}
                        fill
                        className="object-cover"
                        onError={(e) => {
                          e.currentTarget.src = "/placeholder.svg"
                        }}
                      />

                      {isProcessing && (
                        <div className="absolute inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center text-center px-3">
                          <Loader2 className="w-6 h-6 text-white animate-spin mb-2" />
                          <span className="text-white text-sm font-medium">Training…</span>
                        </div>
                      )}

                      {isFailed && (
                        <div className="absolute inset-0 bg-red-900 bg-opacity-70 flex items-center justify-center text-center px-3">
                          <span className="text-white text-sm font-semibold">Training failed</span>
                        </div>
                      )}

                      {!isProcessing && !isFailed && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                          <span className="text-white text-sm font-medium">Click to Select</span>
                        </div>
                      )}

                      {avatar.badge && !isProcessing && !isFailed && (
                        <div className="absolute bottom-2 left-2 text-white text-xs px-2 py-1 rounded bg-[#0376C1]">
                          {avatar.badge}
                        </div>
                      )}
                    </div>
                    <div className="p-3 text-left">
                      <h3 className="font-medium text-[#4E5460] text-sm">{avatar.name}</h3>
                    </div>
                  </CardContent>
                </Card>
              )
            })}

            {/* Create New Avatar Card */}
            <Card
              className="cursor-pointer hover:shadow-lg transition-shadow duration-200 border-2 border-solid border-[#D0E0FF] bg-[#F5F8FF]"
              onClick={handleCreateNewAvatar}
            >
              <CardContent className="p-0">
                <div className="aspect-square flex flex-col items-center justify-center rounded-lg">
                  <div className="w-12 h-12 rounded-full border-2 border-gray-400 flex items-center justify-center mb-3">
                    <Plus className="w-6 h-6 text-gray-400" />
                  </div>
                  <span className="text-sm font-medium text-gray-600">Generate AI Avatar</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {error && allAvatars.length > 0 && (
            <p className="text-center text-red-600 text-sm pb-6">{error}</p>
          )}
        </>
      )}

      <CharacterSelectionModal
        isOpen={characterSelectionOpen}
        onClose={() => setCharacterSelectionOpen(false)}
        character={selectedAvatar}
        isMyCharacter={true}
        onCreateVideo={handleCreateVideo}
        onInteractiveChat={handleInteractiveChat}
        onNameUpdate={handleNameUpdate}
      />

      <CreateAvatarVideoModal open={videoModalOpen} onOpenChange={setVideoModalOpen} avatar={selectedAvatar} />
    </div>
  )
}
