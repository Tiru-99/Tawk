"use client"

import { Phone, Video, MoreVertical, Check , Smile , Send , Paperclip } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"

interface Message {
  id: number
  sender: string
  avatar: string
  content: string
  time: string
  isUser?: boolean
  images?: string[]
}

export default function ChatBox() {
  const messages: Message[] = [
    {
      id: 1,
      sender: "Harry Maguire",
      avatar: "/placeholder.svg?height=40&width=40",
      content: "Hey lads, tough game yesterday. Let's talk about what went wrong and how we can improve 😕",
      time: "08:34 AM",
    },
    {
      id: 2,
      sender: "Bruno Fernandes",
      avatar: "/placeholder.svg?height=40&width=40",
      content: "Agreed, Harry 👍. We had some good moments, but we need to be more clinical in front of the goal 🔥",
      time: "08:34 AM",
    },
    {
      id: 3,
      sender: "You",
      avatar: "/placeholder.svg?height=40&width=40",
      content:
        "We need to control the midfield and exploit their defensive weaknesses. Bruno and Paul, I'm counting on your creativity. Marcus and Jadon, stretch their defense wide. Use your pace and take on their full-backs.",
      time: "08:34 AM",
      isUser: true,
    },
  ]

  return (
    <div className="flex h-screen flex-col bg-white relative ">
      {/* Header */}
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 rounded-full">
            <Image
              src="/man.jpg"
              alt="Team avatar"
              className="aspect-square rounded-full object-cover"
              width={40}
              height={40}
            />
          </div>
          <div>
            <h1 className="font-semibold">United Family</h1>
            <p className="text-sm text-green-500">Rashford is typing...</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon">
            <Video className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <Phone className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="text-center">
          <span className="inline-block rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-500">Today</span>
        </div>

        <div className="space-y-6 py-6">
            {messages.map((message) => (
                <div key={message.id} className={`flex gap-3 ${message.isUser ? "flex-row-reverse" : "flex-row"}`}>
                    {/* Avatar */}
                    <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-200 shrink-0">
                    <Image
                        src="/man.jpg"
                        alt={`${message.sender}'s avatar`}
                        className="object-cover w-full h-full"
                        width={40}
                        height={40}
                    />
                    </div>

                    {/* Message Content */}
                    <div className={`max-w-[70%] ${message.isUser ? "text-right" : ""}`}>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{message.sender}</span>
                        <span className="text-xs text-gray-500">{message.time}</span>
                        {message.isUser && <Check className="h-4 w-4 text-blue-500" />}
                    </div>
                    <div
                        className={`mt-1 rounded-2xl px-4 py-2 ${
                        message.isUser ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-900"
                        }`}
                    >
                        {message.content}
                    </div>
                    </div>
                </div>
                ))}

        </div>
      </div>

      {/* Chat Input box area  */}

      <div className="sticky bottom-0 left-0 w-full border-t bg-white px-4 py-3 ">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-gray-500">
            <Paperclip className="h-5 w-5" />
          </Button>
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Type a message..."
              className="w-full rounded-full border border-gray-300 pl-4 pr-12 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-500"
              // onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <Smile className="h-5 w-5" />
            </Button>
          </div>
          <Button size="icon" className="rounded-full bg-blue-500 text-white hover:bg-blue-600">
            <Send className="h-5 w-5" />
          </Button>
        </div>
        {/* {showEmojiPicker && (
          <div className="mt-2 p-2 bg-white border border-gray-200 rounded-lg shadow-lg">
            <p className="text-sm text-gray-500">Emoji picker placeholder</p>
            
          </div>
        )} */}
      </div>
    </div>
  )
}

