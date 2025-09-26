"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

// Enhanced Skeleton for the entire ChatSidebar
export const ChatSidebarSkeleton = () => {
  return (
    <div className="flex flex-col w-full h-full border border-gray-200/60 rounded-xl bg-white shadow-sm overflow-hidden">
      {/* Top search + actions with better spacing */}
      <div className="px-6 py-5 border-b border-gray-100/80 bg-gradient-to-r from-gray-50/30 to-white">
        <div className="flex justify-center items-center gap-3">
          <div className="relative flex-1">
            <Skeleton className="h-11 w-full rounded-xl bg-gradient-to-r from-gray-200 to-gray-100" />
            {/* Search icon placeholder */}
            <div className="absolute left-3 top-1/2 -translate-y-1/2">
              <Skeleton className="h-4 w-4 rounded-sm" />
            </div>
          </div>
          <Skeleton className="h-11 w-11 rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 shadow-sm" />
          <Skeleton className="h-11 w-11 rounded-xl bg-gradient-to-br from-green-100 to-green-50 shadow-sm" />
        </div>
      </div>

      {/* Enhanced chat list skeleton */}
      <div className="flex-1 overflow-y-auto py-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <ChatCardSkeleton key={i} index={i} />
        ))}
      </div>

      {/* Enhanced bottom navbar skeleton */}
      <div className="border-t border-gray-100/80 px-6 py-4 bg-gradient-to-r from-gray-50/50 to-white">
        <div className="flex justify-around items-center">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <Skeleton 
                className={cn(
                  "h-9 w-9 rounded-xl shadow-sm",
                  i === 1 
                    ? "bg-gradient-to-br from-blue-200 to-blue-100" 
                    : "bg-gradient-to-br from-gray-200 to-gray-100"
                )} 
              />
              <Skeleton className="h-2 w-8 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Enhanced skeleton for each chat card with staggered animation
const ChatCardSkeleton = ({ index }: { index: number }) => {
  return (
    <div 
      className="flex justify-between items-center p-4 mx-3 rounded-lg hover:bg-gray-50/50 transition-colors"
      style={{
        animationDelay: `${index * 0.1}s`
      }}
    >
      <div className="flex gap-3 items-center flex-1">
        {/* Enhanced avatar with online status indicator */}
        <div className="relative">
          <Skeleton className="h-14 w-14 rounded-full bg-gradient-to-br from-gray-200 via-gray-150 to-gray-100 shadow-sm" />
          {/* Online status indicator */}
          <div className="absolute -bottom-0.5 -right-0.5">
            <Skeleton className="h-4 w-4 rounded-full bg-gradient-to-br from-green-200 to-green-100 ring-2 ring-white" />
          </div>
        </div>

        <div className="flex flex-col gap-2 flex-1 min-w-0">
          {/* Name with varied widths for more realistic look */}
          <Skeleton 
            className={cn(
              "h-4 rounded-md bg-gradient-to-r from-gray-200 to-gray-150",
              index % 3 === 0 ? "w-32" : index % 3 === 1 ? "w-24" : "w-28"
            )} 
          />
          {/* Last message with varied widths */}
          <Skeleton 
            className={cn(
              "h-3 rounded-md bg-gradient-to-r from-gray-150 to-gray-100",
              index % 4 === 0 ? "w-44" : index % 4 === 1 ? "w-36" : index % 4 === 2 ? "w-40" : "w-32"
            )} 
          />
        </div>
      </div>

      <div className="flex flex-col items-end gap-2 ml-3">
        {/* Time stamp */}
        <Skeleton className="h-3 w-12 rounded-md bg-gradient-to-r from-gray-150 to-gray-100" />
        
        {/* Notification badge - only show for some items */}
        {(index + 1) % 3 === 0 && (
          <Skeleton className="h-6 w-6 rounded-full bg-gradient-to-br from-red-200 to-red-100 shadow-sm" />
        )}
        
        {/* Unread indicator dot for others */}
        {(index + 1) % 3 !== 0 && index % 2 === 0 && (
          <Skeleton className="h-3 w-3 rounded-full bg-gradient-to-br from-blue-200 to-blue-100" />
        )}
      </div>
    </div>
  )
}

// Alternative compact version
export const CompactChatSidebarSkeleton = () => {
  return (
    <div className="flex flex-col w-full h-full border border-gray-200/60 rounded-2xl bg-white shadow-lg overflow-hidden backdrop-blur-sm">
      {/* Glassmorphism header */}
      <div className="px-5 py-4 border-b border-white/20 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Skeleton className="h-10 w-full rounded-2xl bg-gradient-to-r from-gray-100/80 to-white/80 backdrop-blur-sm border border-gray-200/40" />
          </div>
          <Skeleton className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-100/80 to-purple-100/80 backdrop-blur-sm" />
        </div>
      </div>

      {/* Floating chat cards */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center p-3 rounded-2xl bg-gradient-to-r from-white/60 to-gray-50/40 border border-gray-200/30 shadow-sm backdrop-blur-sm hover:shadow-md transition-all duration-300"
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <div className="relative mr-3">
              <Skeleton className="h-12 w-12 rounded-2xl bg-gradient-to-br from-gray-200/80 to-gray-100/80" />
              <Skeleton className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-gradient-to-br from-emerald-200 to-green-200 ring-2 ring-white/80" />
            </div>
            
            <div className="flex-1 min-w-0 space-y-2">
              <Skeleton className={cn("h-3 rounded-lg bg-gradient-to-r from-gray-200/80 to-gray-100/80", 
                i % 2 === 0 ? "w-28" : "w-20")} />
              <Skeleton className={cn("h-3 rounded-lg bg-gradient-to-r from-gray-150/80 to-gray-100/80",
                i % 3 === 0 ? "w-32" : "w-24")} />
            </div>
            
            <div className="ml-3 text-right space-y-2">
              <Skeleton className="h-2 w-10 rounded-full bg-gradient-to-r from-gray-150/80 to-gray-100/80" />
              {i % 3 === 0 && (
                <Skeleton className="h-5 w-5 rounded-full bg-gradient-to-br from-rose-200 to-red-200 ml-auto" />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modern bottom navigation */}
      <div className="border-t border-white/20 p-4 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-md">
        <div className="flex justify-center gap-8">
          {[0, 1, 2].map((i) => (
            <Skeleton 
              key={i}
              className={cn(
                "h-8 w-8 rounded-2xl shadow-sm",
                i === 1 
                  ? "bg-gradient-to-br from-blue-200/80 to-indigo-200/80" 
                  : "bg-gradient-to-br from-gray-200/80 to-gray-100/80"
              )} 
            />
          ))}
        </div>
      </div>
    </div>
  )
}