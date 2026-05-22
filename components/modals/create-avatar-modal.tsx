"use client"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"
import Image from "@/components/iblai/base-image"

interface CreateAvatarModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectVideo: () => void
  onSelectPhoto: () => void
  onDesignWithAI: () => void
}

export function CreateAvatarModal({
  open,
  onOpenChange,
  onSelectVideo,
  onSelectPhoto,
  onDesignWithAI,
}: CreateAvatarModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 gap-0">
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold text-gray-600">Create Your AI Avatar</DialogTitle>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-6 w-6 rounded-sm">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-gray-600 mt-2">
            Use a video or photo to create your AI avatar's first look. You can add more looks of either type later.
          </p>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-8">
          {/* Start with Video Section */}
          <div className="flex items-start gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-xl font-semibold text-gray-600">Start with video</h3>
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Most realistic</Badge>
              </div>
              <p className="text-gray-600 mb-4">Upload or record video footage to create your first look</p>
              <p className="text-sm text-gray-500">1 / 1 slots remaining</p>
            </div>
            <div className="relative">
              <div className="w-80 h-48 bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl overflow-hidden relative">
                <Image
                  src="/images/design-mode/create_avatar.png"
                  alt="Video preview"
                  fill
                  className="object-cover"
                />
                <div className="absolute top-3 right-3 bg-black/70 text-white text-xs px-2 py-1 rounded">
                  00:10 / 3:00
                </div>
                <div className="absolute bottom-3 left-3">
                  <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 bg-white rounded-sm"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Start with Photo Section */}
          <div className="border-2 border-purple-200 rounded-2xl p-6">
            <div className="flex items-start gap-8">
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-600 mb-4">Start with photo</h3>
                <p className="text-gray-600 mb-6">
                  Upload existing photos or generate new ones to create your first look
                </p>

                <div className="flex gap-4">
                  <Button
                    onClick={onSelectPhoto}
                    variant="outline"
                    className="flex items-center gap-2 px-6 py-3 bg-transparent"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7,10 12,15 17,10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Upload photo
                  </Button>
                  <Button
                    onClick={onDesignWithAI}
                    variant="outline"
                    className="flex items-center gap-2 px-6 py-3 bg-transparent"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    Design with AI
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="w-24 h-24 bg-gray-200 rounded-lg"></div>
                <div className="w-24 h-24 bg-gray-200 rounded-lg"></div>
                <div className="w-24 h-24 bg-gray-200 rounded-lg"></div>
                <div className="w-24 h-24 bg-gray-200 rounded-lg"></div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
