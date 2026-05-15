"use client";

import type React from "react";
import { Suspense } from "react";
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Upload, Link, Sparkles, Trash2, RotateCcw } from "lucide-react";
import Image from "next/image";
import {
    uploadHeygenAsset,
    createHeygenVideoClip,
    ensureUnsignedImageUrl,
    getHeygenVideoStatus,
    listHeygenVoicesPage,
    type HeygenVideoClipAspectRatio,
} from "@/lib/heygen/rest";
import {
    createHeygenPrivateVideoResource,
    publishVideoToMainTenant,
    type VideoVisibility,
} from "@/lib/iblai/catalog";
import { resolveAppTenant } from "@/lib/iblai/tenant";
import { openaiProxyAuthHeaders, openaiProxyUrl } from "@/lib/openai/proxy";
import {
    ChooseVoiceModal,
    type ChosenVoice,
} from "@/components/modals/choose-voice-modal";
import { Mic } from "lucide-react";

function resolutionToAspectRatio(res: string): HeygenVideoClipAspectRatio {
    const [wStr, hStr] = res.split(/[×x]/);
    const w = Number(wStr);
    const h = Number(hStr);
    if (!w || !h || w === h) return "1:1";
    return w > h ? "16:9" : "9:16";
}

const models = [
    {
        id: "heygen",
        name: "HeyGen",
        icon: "/images/models/heygen.png",
        description:
            "HeyGen image-to-video — animate a reference image with a motion prompt. Renders via HeyGen's /v3/videos endpoint.",
    },
];

const resolutions = [
    "1280×768",
    "1920×1080",
    "1024×1024",
    "768×1280",
    "1080×1920",
];

function VideoGeneratorContent() {
    const searchParams = useSearchParams();
    const [selectedModel, setSelectedModel] = useState("heygen");
    const [script, setScript] = useState("");
    const [motionPrompt, setMotionPrompt] = useState("");
    const [resolution, setResolution] = useState("1280×768");
    const [visibility, setVisibility] = useState<VideoVisibility>("platform");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [showUrlInput, setShowUrlInput] = useState(false);
    const [imageUrl, setImageUrl] = useState("");
    const [isLoadingUrl, setIsLoadingUrl] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generateError, setGenerateError] = useState<string | null>(null);
    const [selectedVoice, setSelectedVoice] = useState<ChosenVoice | null>(
        null,
    );
    const [voiceModalOpen, setVoiceModalOpen] = useState(false);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [enhanceError, setEnhanceError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (selectedVoice) return;
        let cancelled = false;
        (async () => {
            try {
                const page = await listHeygenVoicesPage({
                    type: "public",
                    limit: 1,
                });
                const first = page.data?.[0];
                if (cancelled || !first) return;
                setSelectedVoice({
                    id: first.voice_id,
                    name: first.name,
                    language: first.language,
                    gender: first.gender,
                    preview_audio_url: first.preview_audio_url ?? null,
                });
            } catch (err) {
                console.warn("[video-clip] default voice load failed:", err);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [selectedVoice]);

    useEffect(() => {
        const modelFromUrl = searchParams.get("model");
        if (modelFromUrl && models.find((m) => m.id === modelFromUrl)) {
            setSelectedModel(modelFromUrl);
        }

        const scriptFromUrl =
            searchParams.get("script") ?? searchParams.get("prompt");
        if (scriptFromUrl) {
            setScript(decodeURIComponent(scriptFromUrl));
        }
        const motionFromUrl = searchParams.get("motion_prompt");
        if (motionFromUrl) {
            setMotionPrompt(decodeURIComponent(motionFromUrl));
        }
    }, [searchParams]);

    // Clean up preview URL when component unmounts
    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    const currentModel =
        models.find((m) => m.id === selectedModel) || models[0];

    const validateFile = (file: File): boolean => {
        const validTypes = [
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/gif",
            "image/webp",
        ];
        const maxSize = 5 * 1024 * 1024; // 5MB

        if (!validTypes.includes(file.type)) {
            alert("Please select a valid image file (JPG, PNG, GIF, WEBP)");
            return false;
        }

        if (file.size > maxSize) {
            alert("File size must be less than 5MB");
            return false;
        }

        return true;
    };

    const handleFileSelect = (file: File) => {
        if (validateFile(file)) {
            // Clean up previous preview URL
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }

            setSelectedFile(file);
            const newPreviewUrl = URL.createObjectURL(file);
            setPreviewUrl(newPreviewUrl);
            setShowUrlInput(false);
            setImageUrl("");
        }
    };

    const handleUrlUpload = async () => {
        if (!imageUrl.trim()) {
            alert("Please enter a valid image URL");
            return;
        }

        setIsLoadingUrl(true);
        try {
            const response = await fetch(imageUrl);
            if (!response.ok) {
                throw new Error("Failed to fetch image");
            }

            const blob = await response.blob();

            // Check if it's a valid image
            if (!blob.type.startsWith("image/")) {
                throw new Error("URL does not point to a valid image");
            }

            // Create a file from the blob
            const fileName = imageUrl.split("/").pop() || "image";
            const file = new File([blob], fileName, { type: blob.type });

            if (validateFile(file)) {
                // Clean up previous preview URL
                if (previewUrl) {
                    URL.revokeObjectURL(previewUrl);
                }

                setSelectedFile(file);
                const newPreviewUrl = URL.createObjectURL(file);
                setPreviewUrl(newPreviewUrl);
                setShowUrlInput(false);
                setImageUrl("");
            }
        } catch (error) {
            alert(
                "Failed to load image from URL. Please check the URL and try again.",
            );
        } finally {
            setIsLoadingUrl(false);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleFileSelect(files[0]);
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleReUpload = () => {
        fileInputRef.current?.click();
    };

    const handleDelete = () => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        setSelectedFile(null);
        setPreviewUrl(null);
        setShowUrlInput(false);
        setImageUrl("");
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleShowUrlInput = () => {
        setShowUrlInput(true);
    };

    const handleBackToUpload = () => {
        setShowUrlInput(false);
        setImageUrl("");
    };

    const canGenerate = !!selectedFile && !!script.trim() && !isGenerating;

    const handleEnhanceMotionPrompt = async () => {
        setEnhanceError(null);
        setIsEnhancing(true);
        try {
            const system =
                "You rewrite motion prompts for a HeyGen image-to-video avatar. " +
                "Return only the rewritten prompt — no preamble, quotes, or explanation. " +
                "Focus on concrete body motion, gestures, facial expression, and camera framing. " +
                "Keep it under 80 words.";
            const user = motionPrompt.trim()
                ? `Rewrite and expand this motion prompt with vivid, concrete detail:\n\n${motionPrompt.trim()}`
                : "Write a short motion prompt that gives the avatar natural conversational gestures and subtle head/shoulder movement.";
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
                        { role: "system", content: system },
                        { role: "user", content: user },
                    ],
                }),
            });
            if (!res.ok) {
                const text = await res.text().catch(() => "");
                throw new Error(`OpenAI ${res.status}: ${text.slice(0, 200)}`);
            }
            const json = await res.json();
            const out = json?.choices?.[0]?.message?.content?.trim();
            if (!out) throw new Error("OpenAI returned no content");
            setMotionPrompt(out);
        } catch (err) {
            console.error("[video-clip] enhance failed:", err);
            setEnhanceError(
                (err as Error)?.message ?? "Failed to enhance prompt",
            );
        } finally {
            setIsEnhancing(false);
        }
    };

    const handleGenerate = async () => {
        if (!selectedFile) {
            setGenerateError("Upload a reference image first.");
            return;
        }
        if (!script.trim()) {
            setGenerateError("Write a script for the avatar to speak.");
            return;
        }
        if (selectedModel !== "heygen") {
            setGenerateError(
                `${models.find((m) => m.id === selectedModel)?.name ?? selectedModel} isn't wired up yet — pick HeyGen to generate.`,
            );
            return;
        }
        const platform = resolveAppTenant();
        if (!platform) {
            setGenerateError("No tenant resolved — cannot register video.");
            return;
        }

        if (!selectedVoice?.id) {
            setGenerateError("Choose a voice before generating.");
            return;
        }

        setGenerateError(null);
        setIsGenerating(true);
        try {
            const asset = await uploadHeygenAsset(selectedFile);
            const aspectRatio = resolutionToAspectRatio(resolution);
            const title = `Video Clip - ${new Date().toLocaleDateString()}`;
            const { video_id: videoId } = await createHeygenVideoClip({
                image_asset_id: asset.id,
                motion_prompt: motionPrompt.trim() || undefined,
                script: script.trim(),
                voice_id: selectedVoice.id,
                aspect_ratio: aspectRatio,
                title,
            });
            const thumbnail = await ensureUnsignedImageUrl(asset.url);
            await createHeygenPrivateVideoResource(platform, videoId, {
                name: title,
                image_url: thumbnail,
                visibility,
            });
            if (visibility === "public") {
                try {
                    // Wait briefly for HeyGen to finish rendering before snapshotting
                    // the playable URL; if it's not ready, save what we have and let
                    // the user re-publish later. Failure is non-fatal — the source
                    // resource on this tenant is the source of truth.
                    const detail = await getHeygenVideoStatus(videoId).catch(
                        () => null,
                    );
                    await publishVideoToMainTenant({
                        videoId,
                        title,
                        videoUrl: detail?.video_url ?? "",
                        imageUrl: detail?.thumbnail_url ?? thumbnail,
                        duration: detail?.duration,
                        createdAt: detail?.created_at,
                        sourcePlatform: platform,
                    });
                } catch (err) {
                    console.warn("[video-clip] publish-to-main failed:", err);
                }
            }
            window.location.href = "/videos/my";
        } catch (err) {
            console.error("[video-clip] generate failed:", err);
            setGenerateError(
                (err as Error)?.message ?? "Failed to generate video",
            );
            setIsGenerating(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 w-full min-h-full">
            {/* Left Panel */}
            <div className="bg-white">
                {/* Header outside content area */}
                <div className="p-4 sm:p-6 pb-0">
                    <h1 className="text-xl sm:text-2xl font-bold text-[#4E5460]">
                        Generate Video Clip
                    </h1>
                </div>

                {/* Main content area that aligns with right section */}
                <div className="p-4 sm:p-6 pt-4 sm:pt-6">
                    <div className="mx-auto space-y-4 sm:space-y-6 sm:pl-4">
                        {/* Upload Reference Image */}
                        <div className="space-y-3 sm:space-y-4">
                            <h2 className="text-base sm:text-lg font-semibold text-[#4E5460]">
                                Upload Reference Image
                            </h2>

                            <Card className="bg-white border border-gray-200 shadow-sm rounded-lg overflow-hidden">
                                <CardContent className="p-3 sm:p-4">
                                    {!selectedFile ? (
                                        <>
                                            {!showUrlInput ? (
                                                <div
                                                    className={`p-4 sm:p-8 text-center border-2 border-dashed rounded-md transition-colors cursor-pointer ${
                                                        isDragOver
                                                            ? "border-blue-400 bg-blue-50"
                                                            : "border-gray-300 hover:border-gray-400"
                                                    }`}
                                                    onDragOver={handleDragOver}
                                                    onDragLeave={
                                                        handleDragLeave
                                                    }
                                                    onDrop={handleDrop}
                                                    onClick={handleUploadClick}
                                                >
                                                    <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-gray-400">
                                                        <svg
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            strokeWidth="1"
                                                            className="w-full h-full"
                                                        >
                                                            <rect
                                                                x="3"
                                                                y="3"
                                                                width="18"
                                                                height="18"
                                                                rx="2"
                                                                ry="2"
                                                            />
                                                            <circle
                                                                cx="9"
                                                                cy="9"
                                                                r="2"
                                                            />
                                                            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                                                        </svg>
                                                    </div>
                                                    <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4 px-2">
                                                        Drag & drop an image,
                                                        paste from clipboard, or
                                                        upload a file
                                                    </p>
                                                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleUploadClick();
                                                            }}
                                                            className="text-xs sm:text-sm"
                                                        >
                                                            <Upload className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                                                            Upload File
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleShowUrlInput();
                                                            }}
                                                            className="text-xs sm:text-sm"
                                                        >
                                                            <Link className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                                                            Enter URL
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="p-4 sm:p-8 border-2 border-dashed border-gray-300 rounded-md">
                                                    <div className="space-y-3 sm:space-y-4">
                                                        <div className="flex flex-col sm:flex-row gap-2">
                                                            <Input
                                                                type="url"
                                                                placeholder="Enter image URL..."
                                                                value={imageUrl}
                                                                onChange={(e) =>
                                                                    setImageUrl(
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                                className="flex-1 text-sm"
                                                                onKeyDown={(
                                                                    e,
                                                                ) => {
                                                                    if (
                                                                        e.key ===
                                                                        "Enter"
                                                                    ) {
                                                                        handleUrlUpload();
                                                                    }
                                                                }}
                                                            />
                                                            <Button
                                                                onClick={
                                                                    handleUrlUpload
                                                                }
                                                                disabled={
                                                                    isLoadingUrl ||
                                                                    !imageUrl.trim()
                                                                }
                                                                className="bg-blue-500 hover:bg-blue-600 text-white px-4 sm:px-6 text-sm"
                                                            >
                                                                {isLoadingUrl
                                                                    ? "Loading..."
                                                                    : "Upload"}
                                                            </Button>
                                                        </div>

                                                        <div className="text-center">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={
                                                                    handleBackToUpload
                                                                }
                                                                className="text-gray-600 bg-transparent text-xs sm:text-sm"
                                                            >
                                                                <Upload className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                                                                Upload File
                                                                Instead
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="space-y-3 sm:space-y-4">
                                            {/* Image Preview */}
                                            <div className="relative rounded-md overflow-hidden bg-gray-100">
                                                <Image
                                                    src={
                                                        previewUrl! ||
                                                        "/placeholder.svg"
                                                    }
                                                    alt="Selected reference image"
                                                    width={400}
                                                    height={300}
                                                    className="w-full h-32 sm:h-48 object-cover"
                                                />
                                            </div>

                                            {/* File Info */}
                                            <div className="text-xs sm:text-sm text-gray-600">
                                                <p className="font-medium truncate">
                                                    {selectedFile.name}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {(
                                                        selectedFile.size /
                                                        1024 /
                                                        1024
                                                    ).toFixed(2)}{" "}
                                                    MB
                                                </p>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex gap-2 justify-end">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handleReUpload}
                                                    className="text-gray-600 hover:text-gray-800 bg-transparent text-xs"
                                                >
                                                    <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                                    <span className="hidden sm:inline">
                                                        Re-upload
                                                    </span>
                                                    <span className="sm:hidden">
                                                        Re-up
                                                    </span>
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handleDelete}
                                                    className="text-red-600 hover:text-red-800 hover:bg-red-50 bg-transparent text-xs"
                                                >
                                                    <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                                    Delete
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <p className="text-xs text-gray-500">
                                Supported formats: JPG, PNG, GIF, WEBP. Max
                                size: 5MB.
                            </p>

                            {/* Hidden file input */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                                onChange={handleFileInputChange}
                                className="hidden"
                            />
                        </div>

                        {/* Model — only HeyGen is wired up right now, so show it as a
                static badge instead of a dropdown. The icon PNG is a
                light HeyGen wordmark, so we sit it on a dark blue tile
                so it's visible. */}
                        <div className="flex items-center gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-[#0376C1] p-2 sm:h-14 sm:w-14">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={currentModel.icon}
                                    alt={currentModel.name}
                                    className="h-full w-full object-contain"
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-semibold text-[#4E5460] mb-1 text-sm sm:text-base">
                                    {currentModel.name}
                                </div>
                                <div className="text-xs sm:text-sm text-gray-600 leading-relaxed break-words whitespace-normal">
                                    {currentModel.description}
                                </div>
                            </div>
                        </div>

                        {/* Script */}
                        <div className="space-y-2">
                            <h3 className="font-semibold text-[#4E5460] text-sm sm:text-base">
                                Script <span className="text-red-500">*</span>
                            </h3>
                            <Textarea
                                placeholder="What should the avatar say?"
                                value={script}
                                onChange={(e) => setScript(e.target.value)}
                                className="min-h-[100px] sm:min-h-[120px] resize-none text-sm"
                            />
                        </div>

                        {/* Motion Prompt */}
                        <div className="space-y-2">
                            <h3 className="font-semibold text-[#4E5460] text-sm sm:text-base">
                                Prompt
                            </h3>
                            <div className="relative">
                                <Textarea
                                    placeholder="Describe the motion or scene you want (optional)..."
                                    value={motionPrompt}
                                    onChange={(e) =>
                                        setMotionPrompt(e.target.value)
                                    }
                                    className="min-h-[80px] sm:min-h-[100px] resize-none text-sm pb-10 sm:pb-12"
                                />
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleEnhanceMotionPrompt}
                                    disabled={isEnhancing}
                                    className="absolute bottom-2 left-2 h-6 sm:h-8 px-2 sm:px-3 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700"
                                >
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    <span className="hidden sm:inline">
                                        {isEnhancing
                                            ? "Enhancing..."
                                            : "Enhance Prompt"}
                                    </span>
                                    <span className="sm:hidden">
                                        {isEnhancing ? "..." : "Enhance"}
                                    </span>
                                </Button>
                            </div>
                            {enhanceError && (
                                <p className="text-xs text-red-600">
                                    {enhanceError}
                                </p>
                            )}
                        </div>

                        {/* Voice Selector */}
                        <div className="space-y-2">
                            <Button
                                variant="outline"
                                onClick={() => setVoiceModalOpen(true)}
                                className="w-full justify-start h-auto py-2.5 px-3 text-sm"
                            >
                                <Mic className="w-4 h-4 mr-2 text-gray-500" />
                                {selectedVoice?.name
                                    ? `Voice: ${selectedVoice.name}`
                                    : "Choose Voice"}
                            </Button>
                        </div>

                        {/* Resolution Selector */}
                        <div className="space-y-2">
                            <Select
                                value={resolution}
                                onValueChange={setResolution}
                            >
                                <SelectTrigger className="w-full text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {resolutions.map((res) => (
                                        <SelectItem
                                            key={res}
                                            value={res}
                                            className="text-sm"
                                        >
                                            {res}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Visibility */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[#4E5460]">
                                Visibility
                            </label>
                            <Select
                                value={visibility}
                                onValueChange={(v) =>
                                    setVisibility(v as VideoVisibility)
                                }
                            >
                                <SelectTrigger className="w-full text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem
                                        value="personal"
                                        className="text-sm"
                                    >
                                        Private
                                    </SelectItem>
                                    <SelectItem
                                        value="platform"
                                        className="text-sm"
                                    >
                                        Shared on the platform
                                    </SelectItem>
                                    <SelectItem
                                        value="public"
                                        className="text-sm"
                                    >
                                        Shared with the community
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Generate Button */}
                        <Button
                            onClick={handleGenerate}
                            disabled={!canGenerate}
                            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2.5 sm:py-3 text-sm sm:text-base"
                        >
                            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                            {isGenerating ? "Generating..." : "Generate"}
                        </Button>

                        {generateError && (
                            <p className="text-sm text-red-600">
                                {generateError}
                            </p>
                        )}

                        <ChooseVoiceModal
                            open={voiceModalOpen}
                            onOpenChange={setVoiceModalOpen}
                            onSelectVoice={(v) => {
                                setSelectedVoice(v);
                                setVoiceModalOpen(false);
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Right Panel - Aligned with left content area */}
            <div className="relative">
                {/* Content container with proper alignment */}
                <div className="pt-4 sm:pt-[72px] pb-4 sm:pb-6 px-4 sm:pr-6 h-full">
                    <div className="h-full bg-gray-50 rounded-xl border border-[#E6E6E6] flex flex-col min-h-[300px] sm:min-h-0">
                        {/* Header Section */}
                        <div className="text-center p-4 sm:p-6 pb-3 sm:pb-4">
                            <h2 className="text-xl sm:text-2xl font-bold text-[#4E5460] mb-3 sm:mb-4">
                                AI Video Clips
                            </h2>
                            <p className="text-sm sm:text-base text-gray-600 leading-relaxed px-2">
                                By describing imagined scenes or uploading
                                reference images, you can obtain the desired
                                video clip.
                            </p>
                        </div>

                        {/* Video Section - Controlled Height */}
                        <div className="flex-1 max-h-60 sm:max-h-80 px-4 sm:px-6 pb-4 sm:pb-6">
                            <div className="h-full rounded-xl overflow-hidden shadow-lg">
                                <Image
                                    src="/images/characters/ondemand-marcus.png"
                                    alt="On-demand Marcus Aurelius Video"
                                    width={400}
                                    height={300}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function VideoGenerator() {
    return (
        <Suspense
            fallback={
                <div className="flex items-center justify-center min-h-screen">
                    Loading...
                </div>
            }
        >
            <VideoGeneratorContent />
        </Suspense>
    );
}
