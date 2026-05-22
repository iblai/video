"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search, Filter, ChevronDown } from "lucide-react"
import Image from "@/components/iblai/base-image"
import { useRouter } from "next/navigation"
import { Loader } from "@iblai/iblai-js/web-containers"
import { useHeygenAvatars } from "@/hooks/use-heygen-avatars"
import type { HeygenAvatar } from "@/lib/heygen/rest"

type InteractiveAvatar = {
  id: string
  name: string
  image: string
  category: string
  badge: string
}

function mapHeygenInteractive(a: HeygenAvatar): InteractiveAvatar {
  return {
    id: a.id,
    name: a.name || a.id,
    image: a.preview_image_url || "/placeholder.svg",
    category: (a.tags?.[0] ?? "all").toLowerCase(),
    badge: "Interactive",
  }
}

export default function InteractiveAvatarsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  const { avatars, loading, error } = useHeygenAvatars()

  const allAvatars = useMemo(() => avatars.map(mapHeygenInteractive), [avatars])

  const filterTabs = useMemo(() => {
    const cats = new Set<string>()
    for (const a of allAvatars) cats.add(a.category)
    return [
      { id: "all", label: "All" },
      ...Array.from(cats)
        .filter((c) => c && c !== "all")
        .sort()
        .map((c) => ({ id: c, label: c.charAt(0).toUpperCase() + c.slice(1) })),
    ]
  }, [allAvatars])

  const filteredAvatars = allAvatars.filter((avatar) => {
    const matchesSearch = avatar.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = activeTab === "all" || avatar.category === activeTab
    return matchesSearch && matchesCategory
  })

  const handleAvatarClick = (avatar: InteractiveAvatar) => {
    router.push(`/ai-avatar/interactive/${avatar.id}`)
  }

  return (
    <div className="p-6 bg-white min-h-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#4E5460] mb-2">Interactive Avatars</h1>
        <p className="text-gray-600 text-sm mb-6">
          Configure and talk with your AI avatars in real-time conversations.
        </p>

        {/* Search and Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search avatars..."
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

        {/* Filter Tabs */}
        {filterTabs.length > 1 && (
          <div className="flex items-center gap-1 border-b border-gray-200 overflow-x-auto">
            {filterTabs.map((tab) => (
              <Button
                key={tab.id}
                variant="ghost"
                className={`px-4 py-2 rounded-none border-b-2 transition-colors whitespace-nowrap ${
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
        )}
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
            {filteredAvatars.map((avatar) => (
              <Card
                key={avatar.id}
                className="cursor-pointer hover:shadow-lg transition-shadow duration-200 border border-[#D0E0FF] bg-[#F5F8FF] group"
                onClick={() => handleAvatarClick(avatar)}
              >
                <CardContent className="p-0">
                  <div className="relative aspect-square rounded-lg overflow-hidden">
                    <Image src={avatar.image || "/placeholder.svg"} alt={avatar.name} fill className="object-cover" />
                    <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                      <span className="text-white text-sm font-medium">Configure</span>
                    </div>
                    {avatar.badge && (
                      <div className="absolute bottom-2 left-2 bg-[#0376C1] text-white text-xs px-2 py-1 rounded">
                        {avatar.badge}
                      </div>
                    )}
                  </div>
                  <div className="p-3 text-left">
                    <h3 className="font-medium text-[#4E5460] text-sm">{avatar.name}</h3>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredAvatars.length === 0 && allAvatars.length > 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No avatars match your search.</p>
            </div>
          )}

          {allAvatars.length === 0 && !error && (
            <div className="text-center py-12">
              <p className="text-gray-500">No avatars available.</p>
            </div>
          )}

          {error && allAvatars.length > 0 && (
            <p className="text-center text-red-600 text-sm pb-6">{error}</p>
          )}
        </>
      )}
    </div>
  )
}
