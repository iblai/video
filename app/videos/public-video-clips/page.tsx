"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search, Filter, ChevronDown, Play } from "lucide-react"
import Image from "@/components/iblai/base-image"
import VideoPlayerModal from "@/components/modals/video-player-modal"

const filterTabs = [
  { id: "all", label: "All", active: true },
  { id: "business", label: "Business", active: false },
  { id: "computer-science", label: "Computer Science", active: false },
  { id: "humanities", label: "Humanities", active: false },
  { id: "math", label: "Math", active: false },
  { id: "nursing", label: "Nursing", active: false },
  { id: "science", label: "Science", active: false },
  { id: "social-sciences", label: "Social Sciences", active: false },
]

const publicVideos = [
  {
    id: "business-ethics-case-study",
    name: "Business Ethics Case Study Analysis",
    thumbnail: "/images/video-thumbnails/business-ethics-case-study.png",
    duration: "12:30",
    badge: "Business",
  },
  {
    id: "programming-fundamentals",
    name: "Programming Fundamentals in Python",
    thumbnail: "/images/video-thumbnails/programming-fundamentals.png",
    duration: "18:45",
    badge: "Computer Science",
  },
  {
    id: "shakespeare-analysis",
    name: "Shakespeare Literary Analysis",
    thumbnail: "/images/video-thumbnails/shakespeare-analysis.png",
    duration: "15:20",
    badge: "Humanities",
  },
  {
    id: "calculus-derivatives",
    name: "Understanding Calculus Derivatives",
    thumbnail: "/images/video-thumbnails/calculus-derivatives.png",
    duration: "22:15",
    badge: "Math",
  },
  {
    id: "patient-care-protocols",
    name: "Patient Care Protocols",
    thumbnail: "/images/video-thumbnails/patient-care-protocols.png",
    duration: "14:30",
    badge: "Nursing",
  },
  {
    id: "chemistry-lab-safety",
    name: "Chemistry Lab Safety Procedures",
    thumbnail: "/images/video-thumbnails/chemistry-lab-safety.png",
    duration: "11:45",
    badge: "Science",
  },
  {
    id: "psychology-research-methods",
    name: "Psychology Research Methods",
    thumbnail: "/images/video-thumbnails/psychology-research-methods.png",
    duration: "19:20",
    badge: "Social Sciences",
  },
  {
    id: "financial-accounting-basics",
    name: "Financial Accounting Basics",
    thumbnail: "/images/video-thumbnails/financial-accounting-basics.png",
    duration: "16:10",
    badge: "Business",
  },
  {
    id: "data-structures-algorithms",
    name: "Data Structures and Algorithms",
    thumbnail: "/images/video-thumbnails/data-structures-algorithms.png",
    duration: "25:30",
    badge: "Computer Science",
  },
  {
    id: "world-history-renaissance",
    name: "World History: The Renaissance",
    thumbnail: "/images/video-thumbnails/world-history-renaissance.png",
    duration: "20:45",
    badge: "Humanities",
  },
  {
    id: "statistics-probability",
    name: "Statistics and Probability",
    thumbnail: "/images/video-thumbnails/statistics-probability.png",
    duration: "17:30",
    badge: "Math",
  },
  {
    id: "pharmacology-basics",
    name: "Pharmacology Basics for Nurses",
    thumbnail: "/images/video-thumbnails/pharmacology-basics.png",
    duration: "21:15",
    badge: "Nursing",
  },
  {
    id: "biology-cell-structure",
    name: "Biology: Cell Structure and Function",
    thumbnail: "/images/video-thumbnails/biology-cell-structure.png",
    duration: "13:20",
    badge: "Science",
  },
  {
    id: "sociology-social-theory",
    name: "Sociology: Social Theory Overview",
    thumbnail: "/images/video-thumbnails/sociology-social-theory.png",
    duration: "18:50",
    badge: "Social Sciences",
  },
  {
    id: "marketing-strategy-fundamentals",
    name: "Marketing Strategy Fundamentals",
    thumbnail: "/images/video-thumbnails/marketing-strategy-fundamentals.png",
    duration: "14:25",
    badge: "Business",
  },
  {
    id: "machine-learning-intro",
    name: "Introduction to Machine Learning",
    thumbnail: "/images/video-thumbnails/machine-learning-intro.png",
    duration: "23:40",
    badge: "Computer Science",
  },
  {
    id: "philosophy-ethics",
    name: "Philosophy: Introduction to Ethics",
    thumbnail: "/images/video-thumbnails/philosophy-ethics.png",
    duration: "16:35",
    badge: "Humanities",
  },
  {
    id: "linear-algebra-basics",
    name: "Linear Algebra Fundamentals",
    thumbnail: "/images/video-thumbnails/linear-algebra-basics.png",
    duration: "19:10",
    badge: "Math",
  },
  {
    id: "clinical-assessment-skills",
    name: "Clinical Assessment Skills",
    thumbnail: "/images/video-thumbnails/clinical-assessment-skills.png",
    duration: "15:45",
    badge: "Nursing",
  },
  {
    id: "physics-mechanics",
    name: "Physics: Classical Mechanics",
    thumbnail: "/images/video-thumbnails/physics-mechanics.png",
    duration: "24:20",
    badge: "Science",
  },
]

export default function PublicVideoClipsPage() {
  const [activeTab, setActiveTab] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedVideo, setSelectedVideo] = useState<(typeof publicVideos)[0] | null>(null)
  const [videoPlayerOpen, setVideoPlayerOpen] = useState(false)

  const filteredVideos = publicVideos.filter((video) => {
    const matchesCategory = activeTab === "all" || video.badge.toLowerCase().replace(/\s+/g, "-") === activeTab
    const matchesSearch = video.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const handleVideoClick = (video: (typeof publicVideos)[0]) => {
    setSelectedVideo(video)
    setVideoPlayerOpen(true)
  }

  return (
    <div className="p-6 bg-white min-h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#4E5460] mb-6">Public Video Clips</h1>

        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" className="flex items-center gap-2 bg-transparent">
            <Filter className="w-4 h-4" />
            Filters
            <ChevronDown className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1 border-b border-gray-200">
          {filterTabs.map((tab) => (
            <Button
              key={tab.id}
              variant="ghost"
              className={`px-4 py-2 rounded-none border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-[#0376C1] text-[#0376C1] bg-blue-50"
                  : "border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50"
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {filteredVideos.map((video) => (
          <Card
            key={video.id}
            className="cursor-pointer hover:shadow-lg transition-shadow duration-200 border border-[#D0E0FF] bg-[#F5F8FF] group"
            onClick={() => handleVideoClick(video)}
          >
            <CardContent className="p-0">
              <div className="relative aspect-video rounded-lg overflow-hidden">
                <Image src={video.thumbnail || "/placeholder.svg"} alt={video.name} fill className="object-cover" />
                <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                  <Play className="text-white w-12 h-12" />
                </div>
                <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                  {video.duration}
                </div>
                {video.badge && (
                  <div className="absolute bottom-2 left-2 bg-[#0376C1] text-white text-xs px-2 py-1 rounded">
                    {video.badge}
                  </div>
                )}
              </div>
              <div className="p-3 text-left">
                <h3 className="font-medium text-[#4E5460] text-sm">{video.name}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <VideoPlayerModal
        isOpen={videoPlayerOpen}
        onClose={() => setVideoPlayerOpen(false)}
        video={
          selectedVideo
            ? {
                id: selectedVideo.id,
                title: selectedVideo.name,
                thumbnail: selectedVideo.thumbnail,
                videoUrl: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/luma-jCiFM7KKk5QHN1NOGuzcjBcWynmi7n.mp4",
                duration: selectedVideo.duration,
                createdAt: new Date().toLocaleDateString(),
              }
            : null
        }
      />
    </div>
  )
}
