"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import Image from "next/image";
import VideoPlayerModal from "@/components/modals/video-player-modal";
import { Loader } from "@iblai/iblai-js/web-containers";
import {
    getHeygenVideoStatus,
    type HeygenVideoDetail,
} from "@/lib/heygen/rest";
import {
    getCurrentUsername,
    listHeygenPrivateVideoResources,
    updateVideoVisibility,
    type HeygenPrivateVideoResource,
    type VideoVisibility,
} from "@/lib/iblai/catalog";
import { resolveAppTenant } from "@/lib/iblai/tenant";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface VideoClip {
    /** Catalog item_id — stable per-platform record id. */
    id: string;
    heygenVideoId: string;
    title: string;
    thumbnail: string;
    videoUrl: string;
    duration: string;
    durationSeconds?: number;
    createdAtSeconds?: number;
    createdAt: string;
    isGenerating: boolean;
    status?: string;
    failureMessage?: string;
    visibility: VideoVisibility;
    /** Creator — used to hide other users' personal videos. */
    username: string;
    /** Raw catalog resource — needed for the visibility-change flow. */
    resource: HeygenPrivateVideoResource;
}

function formatDuration(seconds?: number): string {
    if (!seconds || Number.isNaN(seconds)) return "";
    const s = Math.round(seconds);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, "0")}`;
}

function toVideoClip(
    resource: HeygenPrivateVideoResource,
    detail: HeygenVideoDetail,
): VideoClip {
    const status = (detail.status ?? "").toLowerCase();
    const terminal = status === "completed" || status === "failed";
    const resourceId = String(resource.item_id ?? resource.id ?? detail.id);
    return {
        id: resourceId,
        heygenVideoId: detail.id ?? resource.data?.id ?? "",
        title: detail.title || resource.name || "Untitled",
        thumbnail:
            detail.thumbnail_url ||
            resource.data?.image_url ||
            resource.url ||
            resource.image ||
            "/placeholder.svg",
        videoUrl: detail.video_url ?? "",
        duration: formatDuration(detail.duration),
        createdAt: detail.created_at
            ? new Date(detail.created_at * 1000).toLocaleDateString()
            : "",
        isGenerating: !terminal,
        status: detail.status,
        failureMessage: detail.failure_message ?? detail.failure_code,
        visibility: resource.data?.visibility ?? "platform",
        username: resource.username ?? resource.data?.username ?? "",
        durationSeconds: detail.duration,
        createdAtSeconds: detail.created_at,
        resource,
    };
}

export default function MyVideoClipsPage() {
    const [selectedVideo, setSelectedVideo] = useState<VideoClip | null>(null);
    const [videoPlayerOpen, setVideoPlayerOpen] = useState(false);
    const [videoClips, setVideoClips] = useState<VideoClip[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Keep a ref mirror of videoClips so the polling interval can read the
    // current list without retriggering on every state update.
    const videoClipsRef = useRef<VideoClip[]>([]);
    useEffect(() => {
        videoClipsRef.current = videoClips;
    }, [videoClips]);

    useEffect(() => {
        const platform = resolveAppTenant();
        if (!platform) {
            setLoading(false);
            return;
        }

        const currentUser = getCurrentUsername();
        let cancelled = false;
        setLoading(true);
        setError(null);
        (async () => {
            try {
                const resources =
                    await listHeygenPrivateVideoResources(platform);
                const results = await Promise.all(
                    resources
                        .filter((r) => r.data?.id)
                        // Drop other users' personal videos before doing the
                        // status-fetch round-trip — saves cost on tenants with many
                        // personal videos owned by other admins.
                        .filter((r) => {
                            if (r.data?.visibility !== "personal") return true;
                            const owner = r.username ?? r.data?.username ?? "";
                            return !!currentUser && owner === currentUser;
                        })
                        .map(async (r) => {
                            try {
                                const detail = await getHeygenVideoStatus(
                                    r.data.id,
                                );
                                return toVideoClip(r, detail);
                            } catch (err) {
                                console.warn(
                                    "[videos/my] status fetch failed",
                                    r.data.id,
                                    err,
                                );
                                return null;
                            }
                        }),
                );
                if (cancelled) return;
                setVideoClips(results.filter((v): v is VideoClip => !!v));
            } catch (err) {
                if (cancelled) return;
                console.error("[videos/my] initial load failed", err);
                setError((err as Error)?.message ?? "Failed to load videos");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    // Poll processing videos every 3 s. Reads current list via ref so the
    // effect itself doesn't restart when clips update.
    useEffect(() => {
        const interval = setInterval(async () => {
            const inFlight = videoClipsRef.current.filter(
                (v) => v.isGenerating && v.heygenVideoId,
            );
            if (inFlight.length === 0) return;
            const updates = await Promise.all(
                inFlight.map(async (v) => {
                    try {
                        const detail = await getHeygenVideoStatus(
                            v.heygenVideoId,
                        );
                        return toVideoClip(
                            {
                                item_id: v.id,
                                id: 0,
                                name: v.title,
                                url: "",
                                resource_type: "heygen_private_video",
                                data: {
                                    id: v.heygenVideoId,
                                    image_url: v.thumbnail,
                                },
                                image: "",
                                description: "",
                            } satisfies HeygenPrivateVideoResource,
                            detail,
                        );
                    } catch (err) {
                        console.warn(
                            "[videos/my] poll tick failed",
                            v.heygenVideoId,
                            err,
                        );
                        return null;
                    }
                }),
            );
            setVideoClips((prev) =>
                prev.map((v) => {
                    const u = updates.find((x) => x && x.id === v.id);
                    return u ?? v;
                }),
            );
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    const handleCreateNewVideo = () => {
        window.location.href = "/videos/generate";
    };

    const handleVideoClick = (video: VideoClip) => {
        if (video.isGenerating) return;
        setSelectedVideo(video);
        setVideoPlayerOpen(true);
    };

    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const handleVisibilityChange = async (
        video: VideoClip,
        next: VideoVisibility,
    ) => {
        if (next === video.visibility) return;
        const platform = resolveAppTenant();
        if (!platform) return;
        setUpdatingId(video.id);
        try {
            const created = await updateVideoVisibility({
                resource: video.resource,
                platform,
                nextVisibility: next,
                publishContext:
                    next === "public" && video.videoUrl
                        ? {
                              videoUrl: video.videoUrl,
                              imageUrl: video.thumbnail,
                              duration: video.durationSeconds,
                              createdAt: video.createdAtSeconds,
                          }
                        : undefined,
            });
            // The catalog has no UPDATE — the helper re-creates the source
            // record under a new catalog id. Swap in the new resource so the
            // next visibility flip doesn't try to delete a stale id.
            const newClipId = String(created.item_id ?? created.id);
            setVideoClips((prev) =>
                prev.map((v) =>
                    v.id === video.id
                        ? {
                              ...v,
                              id: newClipId,
                              visibility: next,
                              resource: created,
                              username:
                                  created.username ??
                                  created.data?.username ??
                                  v.username,
                          }
                        : v,
                ),
            );
        } catch (err) {
            console.error("[videos/my] visibility change failed:", err);
            setError((err as Error)?.message ?? "Failed to update visibility");
        } finally {
            setUpdatingId(null);
        }
    };

    return (
        <div className="p-6 bg-white min-h-full">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-[#4E5460] mb-2">
                    My Video Clips
                </h1>
                <p className="text-lg text-[#4E5460] font-medium">
                    Create stunning videos with your AI avatars using AI-powered
                    generation.
                </p>
            </div>

            {loading && (
                <div className="flex items-center justify-center py-24">
                    <Loader />
                </div>
            )}

            {!loading && error && videoClips.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                    <p className="text-red-600 mb-2 font-medium">
                        Failed to load videos
                    </p>
                    <p className="text-gray-500 text-sm">{error}</p>
                </div>
            )}

            {!loading && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {videoClips.map((video) => (
                        <Card
                            key={video.id}
                            className={`cursor-pointer hover:shadow-lg transition-shadow duration-200 border border-[#D0E0FF] bg-[#F5F8FF] group ${
                                video.isGenerating ? "opacity-75" : ""
                            }`}
                            onClick={() => handleVideoClick(video)}
                        >
                            <CardContent className="p-0">
                                <div className="relative aspect-square rounded-lg overflow-hidden">
                                    <Image
                                        src={
                                            video.thumbnail ||
                                            "/placeholder.svg"
                                        }
                                        alt={video.title}
                                        fill
                                        className="object-cover"
                                        onError={(e) => {
                                            e.currentTarget.src =
                                                "/placeholder.svg";
                                        }}
                                    />

                                    {video.isGenerating && (
                                        <div className="absolute inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center px-3 text-center">
                                            <span className="text-white text-sm font-medium">
                                                {video.status
                                                    ? `HeyGen: ${video.status}`
                                                    : "HeyGen: queued..."}
                                            </span>
                                        </div>
                                    )}

                                    {!video.isGenerating &&
                                        video.status === "failed" && (
                                            <div className="absolute inset-0 bg-red-900 bg-opacity-70 flex flex-col items-center justify-center text-center px-3">
                                                <span className="text-white text-sm font-semibold mb-1">
                                                    Failed
                                                </span>
                                                {video.failureMessage && (
                                                    <span className="text-red-200 text-xs line-clamp-3">
                                                        {video.failureMessage}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                    {!video.isGenerating &&
                                        video.status !== "failed" && (
                                            <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                                                <div className="flex flex-col items-center">
                                                    <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mb-3">
                                                        <svg
                                                            className="w-6 h-6 text-white"
                                                            fill="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path d="M8 5v14l11-7z" />
                                                        </svg>
                                                    </div>
                                                    <span className="text-white text-sm font-medium">
                                                        Click to Play
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                    {!video.isGenerating && video.duration && (
                                        <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                                            {video.duration}
                                        </div>
                                    )}
                                </div>
                                <div className="p-3 text-left">
                                    <h3 className="font-medium text-[#4E5460] text-sm truncate">
                                        {video.title.replace(
                                            /\s*-\s*\d{1,2}\/\d{1,2}\/\d{4}.*$/,
                                            "",
                                        )}
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {video.createdAt}
                                    </p>
                                    <div
                                        className="mt-2"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <Select
                                            value={video.visibility}
                                            onValueChange={(v) =>
                                                handleVisibilityChange(
                                                    video,
                                                    v as VideoVisibility,
                                                )
                                            }
                                            disabled={
                                                updatingId === video.id ||
                                                video.isGenerating
                                            }
                                        >
                                            <SelectTrigger className="h-7 w-full text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem
                                                    value="personal"
                                                    className="text-xs"
                                                >
                                                    Private
                                                </SelectItem>
                                                <SelectItem
                                                    value="platform"
                                                    className="text-xs"
                                                >
                                                    Shared on the platform
                                                </SelectItem>
                                                <SelectItem
                                                    value="public"
                                                    className="text-xs"
                                                >
                                                    Shared with the community
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    <Card
                        className="cursor-pointer hover:shadow-lg transition-shadow duration-200 border-2 border-solid border-[#D0E0FF] bg-[#F5F8FF]"
                        onClick={handleCreateNewVideo}
                    >
                        <CardContent className="p-0">
                            <div className="aspect-square flex flex-col items-center justify-center rounded-lg">
                                <div className="w-12 h-12 rounded-full border-2 border-gray-400 flex items-center justify-center mb-3">
                                    <Plus className="w-6 h-6 text-gray-400" />
                                </div>
                                <span className="text-sm font-medium text-gray-600">
                                    Generate Video Clip
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            <VideoPlayerModal
                isOpen={videoPlayerOpen}
                onClose={() => setVideoPlayerOpen(false)}
                video={selectedVideo}
            />
        </div>
    );
}
