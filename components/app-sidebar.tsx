"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown, ChevronRight, Users, Video, Library, ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useSidebar } from "@/components/ui/sidebar"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import Image from "next/image"

interface SidebarChild {
  id: string
  label: string
  href: string
}

interface SidebarItem {
  id: string
  label: string
  icon: typeof Users
  href?: string
  children: SidebarChild[]
}

const sidebarItems: SidebarItem[] = [
  {
    id: "characters",
    label: "AI Avatars",
    icon: Users,
    children: [
      { id: "characters-generate", label: "Generate", href: "/ai-avatar/generate" },
      { id: "my-characters", label: "My AI Avatars", href: "/ai-avatar/my" },
      { id: "scripts", label: "Scripts", href: "/scripts/add" },
    ],
  },
  {
    id: "video-clips",
    label: "Video Clips",
    icon: Video,
    children: [
      { id: "videos-generate", label: "Generate", href: "/videos/generate" },
      { id: "my-video-clips", label: "My Video Clips", href: "/videos/my" },
      { id: "prompts", label: "Prompts", href: "/videos/prompts" },
    ],
  },
  {
    id: "community",
    label: "Community",
    icon: Library,
    href: "/community",
    children: [],
  },
]

export function AppSidebar() {
  const [expandedItems, setExpandedItems] = useState<string[]>([])
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const pathname = usePathname()
  const { state, toggleSidebar, isMobile, openMobile, setOpenMobile } = useSidebar()

  const isCollapsed = state === "collapsed"

  const visibleSidebarItems = sidebarItems

  useEffect(() => {
    const savedExpandedItems = localStorage.getItem("sidebar-expanded-items")
    if (savedExpandedItems) {
      setExpandedItems(JSON.parse(savedExpandedItems))
    } else {
      const currentSection = getCurrentSection(pathname)
      if (currentSection) {
        setExpandedItems([currentSection])
      }
    }
  }, [pathname])

  useEffect(() => {
    localStorage.setItem("sidebar-expanded-items", JSON.stringify(expandedItems))
  }, [expandedItems])

  const getCurrentSection = (currentPath: string) => {
    if (currentPath === "/") {
      return "ai-avatar"
    }

    for (const item of sidebarItems) {
      if (item.href === currentPath) {
        return item.id
      }
      if (item.children.some((child) => child.href === currentPath)) {
        return item.id
      }
    }
    return null
  }

  const toggleExpanded = (itemId: string) => {
    if (isCollapsed) return
    setExpandedItems((prev) => (prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]))
  }

  const isActiveRoute = (href: string) => {
    if (pathname === "/" && href === "/ai-avatar/generate") {
      return true
    }
    return pathname === href
  }

  const isParentSectionActive = (item: any) => {
    if (item.href && isActiveRoute(item.href)) {
      return true
    }
    return item.children.some((child: any) => isActiveRoute(child.href || ""))
  }

  const HoverMenu = ({ item, children }: { item: any; children: React.ReactNode }) => {
    if (!isCollapsed || item.children.length === 0) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{children}</TooltipTrigger>
          <TooltipContent side="right">{item.label}</TooltipContent>
        </Tooltip>
      )
    }

    return (
      <div className="relative" onMouseEnter={() => setHoveredItem(item.id)} onMouseLeave={() => setHoveredItem(null)}>
        {children}
        {hoveredItem === item.id && (
          <div className="absolute left-full top-0 ml-4 z-50 bg-white border border-videoai-stroke rounded-lg shadow-lg py-2 min-w-[200px]">
            <div className="px-3 py-1 text-sm font-medium text-videoai-text border-b border-videoai-stroke mb-1">
              {item.label}
            </div>
            {item.children.map((child: any) => (
              <Link key={child.id} href={child.href || "#"}>
                <div
                  className={cn(
                    "px-3 py-2 text-sm text-videoai-text hover:bg-videoai-accent hover:text-videoai-primary cursor-pointer",
                    isActiveRoute(child.href || "") && "bg-videoai-accent text-videoai-primary font-medium",
                  )}
                >
                  {child.label}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    )
  }

  const SidebarContent = ({ isMobileSheet = false }: { isMobileSheet?: boolean }) => (
    <TooltipProvider>
      <div className="flex flex-col h-full">
        <div className={cn("px-4 pt-4 border-b border-videoai-stroke pb-[15px]")}>
          <div className="flex items-center gap-2 h-8">
            <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
              <Image src="/images/videogenai-logo.png" alt="videoAI" width={24} height={24} />
            </div>
            <span className="font-semibold text-lg bg-gradient-to-r from-[#00B0EF] to-[#0058CC] bg-clip-text text-transparent">
              videoAI
            </span>
          </div>
        </div>

        <nav className="flex-1 p-4">
          <div className="space-y-2">
            {visibleSidebarItems.map((item) => (
              <div key={item.id}>
                {item.href ? (
                  <Link href={item.href} onClick={() => isMobileSheet && setOpenMobile(false)}>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full gap-2 text-videoai-text hover:bg-videoai-accent hover:text-videoai-primary justify-start",
                        isActiveRoute(item.href) && "bg-videoai-accent text-videoai-primary font-medium",
                      )}
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1 text-left">{item.label}</span>
                    </Button>
                  </Link>
                ) : (
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full gap-2 text-videoai-text hover:bg-videoai-accent hover:text-videoai-primary justify-start",
                      isParentSectionActive(item) && "bg-videoai-accent text-videoai-primary font-medium",
                    )}
                    onClick={() => toggleExpanded(item.id)}
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.children.length > 0 &&
                      (expandedItems.includes(item.id) ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      ))}
                  </Button>
                )}

                {expandedItems.includes(item.id) && item.children.length > 0 && (
                  <div className="ml-6 mt-1 space-y-1 relative">
                    <div className="absolute left-0 top-0 bottom-0 w-px bg-videoai-stroke mr-2"></div>
                    {item.children.map((child) => (
                      <Link
                        key={child.id}
                        href={child.href || "#"}
                        onClick={() => isMobileSheet && setOpenMobile(false)}
                      >
                        <Button
                          variant="ghost"
                          className={cn(
                            "w-full justify-start text-sm text-videoai-text hover:bg-videoai-accent hover:text-videoai-primary pl-4",
                            isActiveRoute(child.href || "") && "bg-videoai-accent text-videoai-primary font-medium",
                          )}
                        >
                          {child.label}
                        </Button>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </nav>
      </div>
    </TooltipProvider>
  )

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent side="left" className="w-72 p-0 bg-white">
          <SidebarContent isMobileSheet={true} />
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <div
      className={cn(
        "bg-white border-r border-videoai-stroke flex flex-col relative transition-all duration-300",
        isCollapsed ? "w-16" : "w-72",
      )}
    >
      <div className={cn("px-4 pt-4 border-b border-videoai-stroke", isCollapsed ? "pb-[15px]" : "pb-[15px]")}>
        <div className="flex items-center gap-2 h-8">
          <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
            <Image src="/images/videogenai-logo.png" alt="videoAI" width={24} height={24} />
          </div>
          {!isCollapsed && (
            <span className="font-semibold text-lg bg-gradient-to-r from-[#00B0EF] to-[#0058CC] bg-clip-text text-transparent">
              videoAI
            </span>
          )}
        </div>
      </div>

      <button
        onClick={toggleSidebar}
        className="absolute -right-4 top-[18px] w-8 h-8 bg-white border border-videoai-stroke rounded-lg flex items-center justify-center hover:bg-videoai-accent transition-colors shadow-sm z-50"
      >
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4 text-gray-600" />
        ) : (
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        )}
      </button>

      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {visibleSidebarItems.map((item) => (
            <div key={item.id}>
              <HoverMenu item={item}>
                {item.href ? (
                  <Link href={item.href}>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full gap-2 text-videoai-text hover:bg-videoai-accent hover:text-videoai-primary",
                        isCollapsed ? "justify-center px-2" : "justify-start",
                        isActiveRoute(item.href) && "bg-videoai-accent text-videoai-primary font-medium",
                      )}
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      {!isCollapsed && <span className="flex-1 text-left">{item.label}</span>}
                    </Button>
                  </Link>
                ) : (
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full gap-2 text-videoai-text hover:bg-videoai-accent hover:text-videoai-primary",
                      isCollapsed ? "justify-center px-2" : "justify-start",
                      isParentSectionActive(item) && "bg-videoai-accent text-videoai-primary font-medium",
                    )}
                    onClick={() => toggleExpanded(item.id)}
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    {!isCollapsed && (
                      <>
                        <span className="flex-1 text-left">{item.label}</span>
                        {item.children.length > 0 &&
                          (expandedItems.includes(item.id) ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          ))}
                      </>
                    )}
                  </Button>
                )}
              </HoverMenu>

              {!isCollapsed && expandedItems.includes(item.id) && item.children.length > 0 && (
                <div className="ml-6 mt-1 space-y-1 relative">
                  <div className="absolute left-0 top-0 bottom-0 w-px bg-videoai-stroke mr-2"></div>
                  {item.children.map((child) => (
                    <Link key={child.id} href={child.href || "#"}>
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full justify-start text-sm text-videoai-text hover:bg-videoai-accent hover:text-videoai-primary pl-4",
                          isActiveRoute(child.href || "") && "bg-videoai-accent text-videoai-primary font-medium",
                        )}
                      >
                        {child.label}
                      </Button>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </nav>
    </div>
  )
}
