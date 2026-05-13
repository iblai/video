"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, Loader2, Maximize, Minimize, RotateCw, RotateCcw, ChevronDown } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  uploadHeygenAsset,
  createHeygenPhotoAvatarGroup,
  finalizeAndTrainPhotoAvatarGroup,
  createHeygenDigitalTwinAvatar,
  createHeygenAvatarConsentUrl,
  extractVideoFrameJpeg,
  ensureUnsignedImageUrl,
} from "@/lib/heygen/rest"
import { createHeygenPrivateAvatarResource } from "@/lib/iblai/catalog"
import { resolveAppTenant } from "@/lib/iblai/tenant"

const characterModels = [
  {
    id: "heygen",
    name: "HeyGen",
    icon: "/images/models/heygen.png",
    description: "Advanced AI avatar generation with realistic facial expressions and natural speech synthesis.",
  },
  {
    id: "d-id",
    name: "D-ID",
    icon: "/images/models/d-id.svg",
    description: "Professional talking head generation with high-quality lip-sync and natural movements.",
  },
  {
    id: "synthesia",
    name: "Synthesia",
    icon: "/images/models/synthesia.svg",
    description: "Enterprise-grade AI avatar platform for creating professional video content with custom avatars.",
  },
]

export default function CreateAvatarPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [imageMode, setImageMode] = useState<"cover" | "contain">("cover")
  const [orientation, setOrientation] = useState<"landscape" | "portrait">("landscape")
  const [selectedModel, setSelectedModel] = useState("heygen")
  const [showModelDropdown, setShowModelDropdown] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowModelDropdown(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const currentModel = characterModels.find((m) => m.id === selectedModel) || characterModels[0]

  const handleModelSelect = (modelId: string) => {
    setSelectedModel(modelId)
    setShowModelDropdown(false)
  }

  const handleDropdownToggle = () => {
    setShowModelDropdown(!showModelDropdown)
    if (!showModelDropdown) {
      // Scroll to dropdown when opening
      setTimeout(() => {
        dropdownRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        })
      }, 100)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
    const newPreviewUrl = URL.createObjectURL(file)
    setPreviewUrl(newPreviewUrl)

    // Start upload process
    handleUpload(file, newPreviewUrl)
  }

  const handleUpload = async (file: File, _previewUrl: string) => {
    void _previewUrl
    setIsUploading(true)
    setUploadProgress(0)
    setUploadError(null)

    // Coarse progress: nudge toward 90% while requests are in flight,
    // snap to 100% once the HeyGen calls resolve.
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => (prev >= 90 ? prev : prev + Math.random() * 10))
    }, 250)

    try {
      const platform = resolveAppTenant()
      if (!platform) throw new Error("No tenant resolved — cannot register avatar")

      const name = file.name.replace(/\.[^.]+$/, "") || "Untitled"
      const isVideo = file.type.startsWith("video/")

      let groupId: string
      let imageUrl: string | undefined

      if (isVideo) {
        // 1a. Capture a thumbnail frame client-side and upload it as an
        // image asset. HeyGen's digital-twin `preview_image_url` points
        // at an unsigned CloudFront path that browsers can't fetch (403),
        // so we store our own captured frame on the catalog side.
        const frameBlob = await extractVideoFrameJpeg(file)
        const thumb = await uploadHeygenAsset(frameBlob)
        imageUrl = await ensureUnsignedImageUrl(thumb.url)

        // 2a. Upload the video, then create a digital-twin avatar from
        // it. HeyGen trains asynchronously — we don't wait for that.
        const videoAsset = await uploadHeygenAsset(file)
        const dt = await createHeygenDigitalTwinAvatar({
          name,
          asset_id: videoAsset.id,
        })
        groupId = dt.avatar_group.id

        // If this tenant enforces consent, open the consent URL in a
        // new tab so the subject can complete it. Training won't finish
        // until consent is granted.
        if (
          dt.avatar_group.consent_status !== "skipped" &&
          dt.avatar_group.consent_status !== "completed"
        ) {
          try {
            const { consent_url } = await createHeygenAvatarConsentUrl(groupId)
            if (consent_url) window.open(consent_url, "_blank", "noopener")
          } catch (err) {
            console.warn("[generate] consent URL fetch failed", err)
          }
        }
      } else {
        // 1b. Upload the photo asset.
        const asset = await uploadHeygenAsset(file)

        // 2b. Photo avatar: create group → wait for photo to finalize →
        // kick off training. Training runs async after this returns.
        const group = await createHeygenPhotoAvatarGroup({
          name,
          image_key: asset.image_key,
        })
        if (!group.group_id) throw new Error("HeyGen did not return a group_id")
        await finalizeAndTrainPhotoAvatarGroup(group.group_id)
        groupId = group.group_id
        // `asset.url` is the long-lived unsigned `/v1/asset` URL of the
        // photo we just uploaded — always use it. We route through
        // `ensureUnsignedImageUrl` defensively so that if HeyGen ever
        // starts signing this path, we'll transparently re-host it via
        // /v1/asset again.
        imageUrl = await ensureUnsignedImageUrl(asset.url)
      }

      // 3. Register the group in the ibl.ai catalog so it's visible to
      // the tenant.
      await createHeygenPrivateAvatarResource(platform, groupId, {
        name,
        image_url: imageUrl,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      setTimeout(() => {
        router.push("/ai-avatar/my")
      }, 500)
    } catch (error) {
      clearInterval(progressInterval)
      console.error("Avatar creation failed:", error)
      setUploadError((error as Error)?.message ?? "Avatar creation failed")
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleUploadClick = () => {
    if (!isUploading) {
      fileInputRef.current?.click()
    }
  }

  const handleContactUs = () => {
    const subject = "Request for Professional AI Avatar Studio Recording"
    const body = `Hello ibl.ai Support Team,

I would like to request professional studio assistance for creating my AI charater. I'm interested in having a high-quality avatar recorded in your studio facilities.

Please provide me with information about:
- Available studio recording sessions
- Pricing and packages
- Scheduling availability
- Technical requirements and preparation guidelines

I'm looking forward to creating a professional AI avatar for my content.

Best regards,
[Your Name]`

    const mailtoLink = `mailto:support@iblai.zendesk.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.open(mailtoLink, "_blank")
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-white mb-5">
        {/* Header Section */}
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-[#4E5460]">Generate AI Avatar</h1>{" "}
            {/* Updated title from Create AI avatar to Generate aharacter */}
            <div className="flex items-center gap-3 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50">
              <div className="w-10 h-10 flex-shrink-0">
                <Image
                  src="/images/ibl-logo.png"
                  alt="ibl.ai"
                  width={40}
                  height={40}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="w-px h-4 bg-gray-300"></div>
              <span className="text-sm text-gray-600">
                Want to create a Studio AI Avatar?{" "}
                <button onClick={handleContactUs} className="text-videoai-primary hover:underline font-medium">
                  Contact Us
                </button>
              </span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl mx-auto">
            {/* Left Panel */}
            <div className="space-y-4">
              {/* Start with Photo Section */}
              <Card className="bg-white border border-gray-200 shadow-sm rounded-lg">
                <CardContent className="p-4">
                  <h3 className="text-lg font-semibold text-[#4E5460] mb-2">Start with a photo</h3>
                  <p className="text-gray-600 mb-4 text-sm">
                    Upload existing photos or generate new ones to create your first look
                  </p>

                  {!selectedFile ? (
                    <div
                      className={`p-4 text-center border-2 border-dashed rounded-md transition-colors cursor-pointer ${
                        isDragOver ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-gray-400"
                      } ${isUploading ? "pointer-events-none opacity-50" : ""}`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={handleUploadClick}
                    >
                      <div className="w-10 h-10 mx-auto mb-2 text-gray-400">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1"
                          className="w-full h-full"
                        >
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                          <circle cx="9" cy="9" r="2" />
                          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                        </svg>
                      </div>
                      <p className="text-gray-600 mb-2 text-sm">Upload or Drag & Drop</p>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isUploading}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleUploadClick()
                        }}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Photo
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="relative rounded-md overflow-hidden bg-gray-100 group">
                        <Image
                          src={previewUrl! || "/placeholder.svg"}
                          alt="Selected reference"
                          width={400}
                          height={150}
                          className={`w-full h-24 transition-all duration-300 ${
                            imageMode === "cover" ? "object-cover" : "object-contain"
                          } ${orientation === "portrait" ? "transform rotate-90" : ""}`}
                        />

                        {/* Interactive Control Icons */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <div className="flex gap-2 bg-black bg-opacity-50 rounded-lg p-2">
                            {/* Full Screen Cover */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => setImageMode("cover")}
                                  className={`p-2 rounded transition-colors ${
                                    imageMode === "cover"
                                      ? "bg-blue-500 text-white"
                                      : "bg-white bg-opacity-20 text-white hover:bg-opacity-30"
                                  }`}
                                >
                                  <Maximize className="w-4 h-4" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Full Screen (Cover)</p>
                              </TooltipContent>
                            </Tooltip>

                            {/* Full Screen Contain */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => setImageMode("contain")}
                                  className={`p-2 rounded transition-colors ${
                                    imageMode === "contain"
                                      ? "bg-blue-500 text-white"
                                      : "bg-white bg-opacity-20 text-white hover:bg-opacity-30"
                                  }`}
                                >
                                  <Minimize className="w-4 h-4" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Full Screen (Contain)</p>
                              </TooltipContent>
                            </Tooltip>

                            {/* Landscape Orientation */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => setOrientation("landscape")}
                                  className={`p-2 rounded transition-colors ${
                                    orientation === "landscape"
                                      ? "bg-blue-500 text-white"
                                      : "bg-white bg-opacity-20 text-white hover:bg-opacity-30"
                                  }`}
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Orientation: Landscape</p>
                              </TooltipContent>
                            </Tooltip>

                            {/* Portrait Orientation */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => setOrientation("portrait")}
                                  className={`p-2 rounded transition-colors ${
                                    orientation === "portrait"
                                      ? "bg-blue-500 text-white"
                                      : "bg-white bg-opacity-20 text-white hover:bg-opacity-30"
                                  }`}
                                >
                                  <RotateCw className="w-4 h-4" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Orientation: Portrait</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>

                        {isUploading && (
                          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                            <div className="text-center text-white">
                              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                              <p className="text-sm">Uploading... {Math.round(uploadProgress)}%</p>
                              <div className="w-32 bg-gray-200 rounded-full h-2 mt-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${uploadProgress}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-gray-500 mt-3">Supported formats: JPG, PNG, GIF, WEBP. Max size: 10MB.</p>
                  {uploadError && (
                    <p className="text-xs text-red-600 mt-2">{uploadError}</p>
                  )}
                </CardContent>
              </Card>

              {/* Divider */}
              <div className="flex items-center">
                <div className="flex-1 border-t border-gray-300"></div>
                <span className="px-3 text-sm text-gray-500 bg-white">or</span>
                <div className="flex-1 border-t border-gray-300"></div>
              </div>

              {/* Start with Video Section */}
              <Card className="bg-white border border-gray-200 shadow-sm rounded-lg">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-[#4E5460]">Start with video</h3>
                    <span className="bg-videoai-accent text-videoai-primary border border-videoai-stroke text-xs px-2 py-1 rounded font-medium">
                      Most realistic
                    </span>
                  </div>
                  <p className="text-gray-600 mb-4 text-sm">Upload or record video footage to create your first look</p>

                  <div
                    className={`p-4 text-center border-2 border-dashed rounded-md transition-colors cursor-pointer ${
                      isDragOver ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-gray-400"
                    } ${isUploading ? "pointer-events-none opacity-50" : ""}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={handleUploadClick}
                  >
                    {isUploading ? (
                      <div className="text-center">
                        <Loader2 className="w-10 h-10 animate-spin mx-auto mb-2 text-blue-500" />
                        <p className="text-gray-600 mb-2 text-sm">Processing... {Math.round(uploadProgress)}%</p>
                        <div className="w-48 bg-gray-200 rounded-full h-2 mx-auto">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          ></div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="w-10 h-10 mx-auto mb-2 text-gray-400">
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1"
                            className="w-full h-full"
                          >
                            <polygon points="23 7 16 12 23 17 23 7" />
                            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                          </svg>
                        </div>
                        <p className="text-gray-600 mb-2 text-sm">Upload or Drag & Drop</p>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isUploading}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleUploadClick()
                          }}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Video
                        </Button>
                      </>
                    )}
                  </div>

                  <p className="text-xs text-gray-500 mt-3">Supported formats: MP4, MOV, WEBM. Max size: 100MB.</p>
                </CardContent>
              </Card>

              <div className="space-y-2" ref={dropdownRef}>
                <h3 className="text-lg font-semibold text-[#4E5460]">Select Model</h3>
                <div className="relative">
                  <Button
                    variant="outline"
                    className="w-full justify-between h-auto p-4 bg-transparent hover:bg-gray-50 text-left"
                    onClick={handleDropdownToggle}
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0 pr-2">
                      <div className="w-6 h-6 flex-shrink-0 mt-0.5 rounded bg-[#0376C1] p-1">
                        <Image
                          src={currentModel.icon || "/placeholder.svg"}
                          alt={currentModel.name}
                          width={24}
                          height={24}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-[#4E5460] mb-1">{currentModel.name}</div>
                        <div className="text-sm text-gray-600 leading-relaxed break-words whitespace-normal">
                          {currentModel.description}
                        </div>
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${
                        showModelDropdown ? "rotate-180" : ""
                      }`}
                    />
                  </Button>

                  {showModelDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                      {characterModels
                        .filter((model) => model.id !== selectedModel)
                        .map((model) => (
                          <div
                            key={model.id}
                            className={`flex items-start gap-3 p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors`}
                            onClick={() => handleModelSelect(model.id)}
                          >
                            <div className="w-6 h-6 flex-shrink-0 mt-0.5 rounded bg-[#0376C1] p-1">
                              <Image
                                src={model.icon || "/placeholder.svg"}
                                alt={model.name}
                                width={24}
                                height={24}
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <div className="flex-1 min-w-0 pr-2">
                              <div className="font-semibold text-[#4E5460] mb-1">{model.name}</div>
                              <div className="text-sm text-gray-600 leading-relaxed break-words whitespace-normal">
                                {model.description}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Panel */}
            <div className="lg:pl-4 flex">
              <div className="bg-gray-50 rounded-xl border border-[#E6E6E6] p-4 w-full flex flex-col">
                {/* Header Section - Fixed at top */}
                <div className="text-center mb-4">
                  <h2 className="text-2xl font-bold text-[#4E5460] mb-2">AI Avatar</h2>
                  <p className="text-gray-600 text-sm">
                    By describing imagined scenes or uploading reference images, you can obtain the desired AI avatar.
                  </p>
                </div>
                <div className="flex-1 max-h-70 sm:max-h-80 pb-4 sm:pb-6">
                  <div className="h-full rounded-xl overflow-hidden shadow-lg">
                    <Image
                      src="/images/characters/interactive-marcus.png"
                      alt="Interactive Marcus Aurelius AI Avatar"
                      width={400}
                      height={300}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {/* Flexible spacer to fill remaining height */}
                <div className="flex-1"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>
    </TooltipProvider>
  )
}
