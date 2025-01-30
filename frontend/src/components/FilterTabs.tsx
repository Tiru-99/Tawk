"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

export default function FilterTabs() {
  const [activeTab, setActiveTab] = useState("all")

  const tabs = [
    { id: "all", label: "All" },
    { id: "personal", label: "Personal" },
    { id: "groups", label: "Groups" },
  ]

  return (
    <div className="flex justify-center  bg-gray-100 py-2 -px-1 w-full rounded-full ">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={cn(
            "px-5 py-2 text-sm transition-colors",
            "rounded-md",
            activeTab === tab.id ? "bg-white rounded-full text-blue-500 shadow-sm" : "text-gray-500 hover:text-gray-900",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

