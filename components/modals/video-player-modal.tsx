"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Download, Share2, X } from "lucide-react"
import { ShareModal } from "./share-modal"
import { withBasePath } from "@/lib/iblai/base-path"

interface VideoClip {
  id: string
  title: string
  thumbnail: string
  videoUrl: string
  duration: string
  createdAt: string
}

interface VideoPlayerModalProps {
  isOpen: boolean
  onClose: () => void
  video: VideoClip | null
}

export default function VideoPlayerModal({ isOpen, onClose, video }: VideoPlayerModalProps) {
  const [shareModalOpen, setShareModalOpen] = useState(false)

  if (!video) return null

  const handleDownload = () => {
    const link = document.createElement("a")
    link.href = video.videoUrl
    link.download = `${video.title}.mp4`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleShare = () => {
    setShareModalOpen(true)
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 bg-black">
          <DialogTitle className="sr-only">Video Player</DialogTitle>
          <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-white text-lg font-semibold">{video.title}</h2>
                <p className="text-gray-300 text-sm">
                  {video.createdAt} • {video.duration}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={handleShare} className="text-white hover:bg-white/20">
                  <Share2 className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleDownload} className="text-white hover:bg-white/20">
                  <Download className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Video Player */}
          <div className="relative aspect-video w-full">
            <video
              src={video.videoUrl}
              controls
              autoPlay
              className="w-full h-full object-contain"
              poster={video.thumbnail}
            >
              Your browser does not support the video tag.
            </video>
          </div>

        
        </DialogContent>
      </Dialog>

      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        shareUrl={`${window.location.origin}${withBasePath(`/video/watch/${video.id}`)}`}
      />
    </>
  )
}
