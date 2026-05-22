"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { X, Upload, Check } from "lucide-react"
import Image from "@/components/iblai/base-image"

interface UploadPhotoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpload: (files: File[]) => void
}

export function UploadPhotoModal({ open, onOpenChange, onUpload }: UploadPhotoModalProps) {
  const [dragOver, setDragOver] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    setSelectedFiles(files)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      setSelectedFiles(files)
    }
  }

  const handleUpload = () => {
    onUpload(selectedFiles)
    onOpenChange(false)
  }

  const goodPhotos = [
    "/placeholder.svg?height=120&width=120&text=Good+Photo+1",
    "/placeholder.svg?height=120&width=120&text=Good+Photo+2",
    "/placeholder.svg?height=120&width=120&text=Good+Photo+3",
    "/placeholder.svg?height=120&width=120&text=Good+Photo+4",
    "/placeholder.svg?height=120&width=120&text=Good+Photo+5",
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold text-gray-600">Upload Photos of Your Avatar</DialogTitle>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-6 w-6 rounded-sm">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-gray-600 mt-2">Upload photos to create multiple looks for your avatar</p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Upload Area */}
          <div
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
              dragOver ? "border-purple-400 bg-purple-50" : "border-purple-200 bg-purple-25"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="w-16 h-16 mx-auto mb-4 border-2 border-dashed border-purple-300 rounded-lg flex items-center justify-center">
              <Upload className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-600 mb-2">Drag and drop photos to upload</h3>
            <p className="text-gray-600 mb-4">Upload PNG, JPG, HEIC, or WebP file up to 200MB</p>
            <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="px-6">
              Select Photos
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Photo Requirements */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-600">Photo Requirements</h3>

            {/* Good Photos */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
                <h4 className="font-semibold text-gray-600">Good Photos</h4>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">
                Recent photos of yourself (just you), showing a mix of close-ups and full-body shots, with different
                angles, expressions (smiling, neutral, serious), and a variety of outfits. Make sure they are
                High-resolution and reflect your current appearance.
              </p>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {goodPhotos.map((photo, index) => (
                  <div key={index} className="relative flex-shrink-0">
                    <Image
                      src={photo || "/placeholder.svg"}
                      alt={`Good photo example ${index + 1}`}
                      width={120}
                      height={120}
                      className="rounded-lg object-cover"
                    />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bad Photos */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                  <X className="w-4 h-4 text-white" />
                </div>
                <h4 className="font-semibold text-gray-600">Bad Photos</h4>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="px-8">
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={selectedFiles.length === 0}
              className="px-8 bg-purple-500 hover:bg-purple-600"
            >
              Upload
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
