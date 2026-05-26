"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search, Play, Loader2 } from "lucide-react"
import Image from "@/components/iblai/base-image"
import VideoPlayerModal from "@/components/modals/video-player-modal"
import {
  listHeygenPrivateVideoResources,
  PUBLIC_VIDEO_TENANT,
  type HeygenPrivateVideoResource,
} from "@/lib/iblai/catalog"
import { probeImage } from "@/lib/iblai/probe-image"

/**
 * Community lists every video that was published with
 * `visibility: "public"`. Public videos are mirrored to the `main`
 * tenant catalog at publish time with their play URL + thumbnail
 * embedded, so this page reads from `main` only and never has to call
 * HeyGen (HeyGen API keys are tenant-scoped, so the main tenant
 * couldn't resolve URLs for source-tenant videos anyway).
 */

interface CommunityVideo {
  id: string
  name: string
  thumbnail: string
  duration: string
  videoUrl: string
  createdAt: string
  sourcePlatform: string
}

function formatDuration(seconds?: number): string {
  if (!seconds || Number.isNaN(seconds)) return ""
  const s = Math.round(seconds)
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${String(r).padStart(2, "0")}`
}

function toCommunityVideo(
  resource: HeygenPrivateVideoResource,
): CommunityVideo {
  const data = resource.data
  return {
    id: data?.id ?? String(resource.item_id ?? resource.id),
    name: data?.title || resource.name || "Untitled",
    thumbnail: data?.image_url || resource.image || "/placeholder.svg",
    duration: formatDuration(data?.duration),
    videoUrl: data?.video_url ?? "",
    createdAt: data?.created_at
      ? new Date(data.created_at * 1000).toLocaleDateString()
      : "",
    sourcePlatform: data?.source_platform ?? "",
  }
}

export default function CommunityPage() {
  const [videos, setVideos] = useState<CommunityVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [selected, setSelected] = useState<CommunityVideo | null>(null)
  const [playerOpen, setPlayerOpen] = useState(false)
  const requestIdRef = useRef(0)

  // Debounce the search input so we don't filter on every keystroke.
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 400)
    return () => clearTimeout(handle)
  }, [searchQuery])

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    try {
      const resources = await listHeygenPrivateVideoResources(
        PUBLIC_VIDEO_TENANT,
      )
      if (requestId !== requestIdRef.current) return
      const candidates = resources
        .filter((r) => r.data?.visibility === "public")
        .filter((r) => !!r.data?.video_url)
        .map(toCommunityVideo)

      // HeyGen asset URLs are signed S3 links that expire. Drop any
      // card whose thumbnail no longer loads (403/404) so the grid
      // doesn't show broken images. We probe with an `Image()` —
      // `fetch(..., no-cors)` returns an opaque response that always
      // looks 200 to JS, so it can't distinguish good from expired.
      const probes = await Promise.all(
        candidates.map((v) =>
          probeImage(v.thumbnail).then((ok) => ({ v, ok })),
        ),
      )
      if (requestId !== requestIdRef.current) return
      setVideos(probes.filter((p) => p.ok).map((p) => p.v))
    } catch (err) {
      if (requestId !== requestIdRef.current) return
      console.error("[community] load failed:", err)
      setVideos([])
    } finally {
      if (requestId === requestIdRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const visible = videos.filter((v) => {
    if (!debouncedQuery) return true
    return v.name.toLowerCase().includes(debouncedQuery.toLowerCase())
  })

  const handleContentClick = (video: CommunityVideo) => {
    setSelected(video)
    setPlayerOpen(true)
  }

  return (
    <div className="p-6 bg-white min-h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#4E5460] mb-6">Community</h1>

        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search by title"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Loading videos…
        </div>
      ) : visible.length === 0 ? (
        <div className="py-16 text-center text-gray-500">
          {debouncedQuery
            ? `No videos found matching "${debouncedQuery}".`
            : "No public videos yet. Mark a generated video as Public and it will land here."}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {visible.map((video) => (
            <Card
              key={video.id}
              className="cursor-pointer hover:shadow-lg transition-shadow duration-200 border border-videoai-stroke bg-[#F5F8FF] group"
              onClick={() => handleContentClick(video)}
            >
              <CardContent className="p-0">
                <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
                  {video.thumbnail && (
                    <Image
                      src={video.thumbnail}
                      alt={video.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  )}
                  <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                    <Play className="text-white w-12 h-12" />
                  </div>
                  {video.duration && (
                    <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                      {video.duration}
                    </div>
                  )}
                </div>
                <div className="p-3 text-left">
                  <h3 className="font-medium text-[#4E5460] text-sm line-clamp-2">
                    {video.name}
                  </h3>
                  {video.createdAt && (
                    <p className="text-xs text-gray-500 mt-1">{video.createdAt}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <VideoPlayerModal
        isOpen={playerOpen}
        onClose={() => setPlayerOpen(false)}
        video={
          selected
            ? {
                id: selected.id,
                title: selected.name,
                thumbnail: selected.thumbnail,
                videoUrl: selected.videoUrl,
                duration: selected.duration,
                createdAt: selected.createdAt,
              }
            : null
        }
      />
    </div>
  )
}
