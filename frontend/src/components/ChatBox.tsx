"use client"

import type React from "react"

import { useEffect, useState, useMemo, useRef } from "react"
import { Phone, Video, MoreVertical, Check, Smile, Send, Paperclip, Clock, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { useRouter } from "next/navigation"
import axios from "axios"
import { io } from "socket.io-client"
import { Loader2 } from "lucide-react"

interface Message {
  id: number
  sender: string
  avatar: string
  content: string
  time: string
  isUser?: boolean
  images?: string[]
}

export enum MessageType {
  TEXT = "TEXT",
  IMAGE = "IMAGE",
  CALL = "CALL",
}


interface MessageProps {
  id: string
  content: string
  imageUrl: string
  createdAt: Date
  senderId: string
  chatId: string
  user: MessageUserProps
  type: MessageType
}

interface MessageUserProps {
  userId: string
  username: string
  profile_pic: string
}

interface User {
  id: string
  username: string
  email: string
  profile_pic: string
}

interface ChatUser {
  userId: string
  chatId: string
  user: User
}

interface ChatDetailsProps {
  createdAt: Date
  id: string
  name: string
  isGroup: boolean
  users: ChatUser[]
}

type ChatBoxProps = {
  selectedChat: string
}

export default function ChatBox({ selectedChat }: ChatBoxProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<MessageProps[]>([])
  const [message, setMessage] = useState<string>("")
  const [chatDetails, setChatDetails] = useState<ChatDetailsProps>()
  const lastMessageRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputFile = e.target.files?.[0]

    if (!inputFile) {
      return
    }

    console.log("The selected file is", inputFile)
    setFile(inputFile)
  }

  const removeImage = () => {
    setFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  //use memo hook to initialise the socket only once
  const socket = useMemo(() => {
    const newSocket = io(`${process.env.NEXT_PUBLIC_BACKEND_URL}`, {
      withCredentials: true,
    })

    newSocket.on("connect", () => {
      console.log("Connected to the socket server")
    })

    return newSocket
  }, [])

  console.log("The messages are", messages)

  useEffect(() => {
    if (!selectedChat) return
    setIsLoading(true);
    console.log("Selected Chat", selectedChat)

    socket.emit("join-chat", selectedChat)

    // Fetch messages when the chat is selected
    axios
      .get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/message/getmessages/${selectedChat}/${localStorage.userId}`)
      .then((res) => {
        setMessages(res.data.data)
        setChatDetails(res.data.chatDetails)
        console.log("Fetched messages: ", res.data.data)
        setIsLoading(false);
      })
      .catch((error) => {
        console.log("Error fetching messages: ", error)
        setIsLoading(false);
      })

    // Handle incoming messages
    const handleNewMessage = (newMessage: MessageProps) => {
      console.log("Received new message:", newMessage)

      setMessages((prevMessages) => [...prevMessages, newMessage])
      //call save message here
    }

    socket.on("new-message", handleNewMessage)
    //scroll to the last message

    // Cleanup function to remove event listener when component unmounts
    return () => {
      socket.off("new-message", handleNewMessage)
    }
  }, [selectedChat])

  useEffect(() => {
    //scroll to the last message
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  const handleSendMessage = async () => {
    console.log("The code is reaching here part 1")
    const trimmedMessage = message.trim()
    if (!trimmedMessage && !file) return

    const senderId = localStorage.getItem("userId")
    if (!senderId || !selectedChat) {
      console.error("Missing senderId or chatId")
      return
    }

    console.log("The code is reaching here part 2 ")

    const messageData = {
      senderId,
      content: trimmedMessage,
      chatId: selectedChat,
      type: file ? "IMAGE" : "TEXT",
      imageUrl: "",
    }

    if (file) {
      console.log("the code is reaching here part 3")
      let imageUrl = ""
      try {
        const response = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/upload/get-presigned-url`, {
          params: {
            fileType: file.type,
          },
        })

        const { key, url } = response.data
        console.log("the key is ", key)
        console.log("The url is ", url)

        //upload file to s3

        await axios.put(url, file, {
          headers: {
            "Content-Type": file.type,
          },
        })

        //get the stored object from s3
        imageUrl = `https://${process.env.NEXT_PUBLIC_BUCKET_NAME}.s3.amazonaws.com/${key}`
        messageData.imageUrl = imageUrl
      } catch (error) {
        console.log("Something went wrong while uploading the image to s3 ", error)
        return
      }
    }

    console.log("the code is reaching here part4")

    // Emit through socket for real-time updates
    socket.emit("send-message", messageData)

    // Optimistically update UI here if needed
    // addMessageToChat(messageData); // Optional function to update UI instantly

    // try {
    //   await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/message/send-message`, messageData)
    // } catch (error) {
    //   console.error("Failed to save message:", error)
    //   // Optional: show toast or mark message as "unsynced"
    // }

    setMessage("") // Clear input
    setFile(null) // Clear file after sending
  }

  // Format timestamp to display time
  const formatTime = (dateString: Date) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const handleVideoCall = async () => {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      console.log("No user id found");
      return;
    }
    const messageData = {
      senderId: userId,
      content: "video-call",
      chatId: selectedChat,
      type: "CALL",
    }
    socket.emit("video-call-message", messageData);
    router.push(`/sample/${selectedChat}`)
  }

  return (
    <>

      {selectedChat ? (
        <div className="flex h-screen flex-col bg-gradient-to-b from-gray-50 to-white relative">
          {/* Header */}
          <header className="flex items-center justify-between border-b px-6 py-4 bg-white shadow-sm">
            <div className="flex items-center gap-4">
              <span className="block md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </span>
              <div className="relative h-12 w-12 rounded-full overflow-hidden border-2 border-gray-100 shadow-sm">
                <Image
                  src={
                    !chatDetails?.isGroup
                      ? (chatDetails?.users.find((u) => u.user.id !== localStorage.getItem("userId"))?.user
                        .profile_pic ?? "/default-avatar.png")
                      : "/default-avatar.png"
                  }
                  alt="profile picture"
                  width={48}
                  height={48}
                  className="rounded-full object-cover"
                />
                <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white"></div>
              </div>
              <div>
                <h1 className="font-semibold text-lg cursor-pointer hover:text-gray-700 transition-colors">
                  {chatDetails?.name}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-gray-100"
                onClick={handleVideoCall}>
                <Video className="h-5 w-5 text-gray-600" />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-gray-100">
                <Phone className="h-5 w-5 text-gray-600" />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-gray-100">
                <MoreVertical className="h-5 w-5 text-gray-600" />
              </Button>
            </div>
          </header>

          {/* Chat Area */}
          {isLoading && (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="animate-spin w-6 h-6 text-gray-500" />
            </div>
          )}
          {!isLoading && <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
            <div className="text-center mb-6">
              <span className="inline-block rounded-full bg-gray-200 px-4 py-1.5 text-sm font-medium text-gray-700 shadow-sm">
                Today
              </span>
            </div>

            <div className="space-y-8">
              {messages.length > 0 &&
                messages.map((message, index) => (
                  <div
                    key={message.id}
                    className={`flex gap-4 ${message.senderId === localStorage.getItem("userId")
                      ? "flex-row-reverse"
                      : "flex-row"
                      }`}
                    ref={index === messages.length - 1 ? lastMessageRef : null}
                  >
                    {/* Avatar */}
                    <div
                      className={`relative w-10 h-10 rounded-full overflow-hidden bg-gray-200 shrink-0 ${message.senderId === localStorage.getItem("userId")
                        ? "order-2"
                        : "order-1"
                        }`}
                    >
                      <Image
                        src={message.user?.profile_pic || "/default-avatar.png"}
                        alt={`${message.user?.username || "User"}'s avatar`}
                        className="object-cover w-full h-full"
                        width={40}
                        height={40}
                      />
                    </div>

                    {/* Message Content */}
                    <div
                      className={`max-w-[70%] ${message.senderId === localStorage.getItem("userId")
                        ? "order-1"
                        : "order-2"
                        }`}
                    >
                      {/* User info and time */}
                      <div
                        className={`flex items-center gap-2 mb-1 ${message.senderId === localStorage.getItem("userId")
                          ? "justify-end"
                          : "justify-start"
                          }`}
                      >
                        <span className="text-sm font-medium text-gray-700">
                          {message.senderId === localStorage.getItem("userId")
                            ? "You"
                            : message.user?.username || "Unknown"}
                        </span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(message.createdAt)}
                        </span>
                        {message.senderId === localStorage.getItem("userId") && (
                          <Check className="h-4 w-4 text-green-500" />
                        )}
                      </div>

                      {/* Message Body */}
                      {message.type === "CALL" ? (
                        <div
                          className="p-3 border border-blue-200 bg-blue-50 rounded-xl text-sm text-blue-600 flex items-center gap-2 cursor-pointer hover:bg-blue-100 transition"
                          onClick={() => {
                            // const userId = localStorage.getItem("userId");
                            // const username = localStorage.getItem("username");
                            // const profilePic = localStorage.getItem("profile_pic");
                            router.push(`/sample/${selectedChat}`)
                          }}
                        >
                          <Video className="w-4 h-4" />
                          <span>Video Call</span>
                        </div>
                      ) : (
                        <div
                          className={`rounded-2xl px-4 py-3 shadow-sm ${message.imageUrl && !message.content
                            ? "bg-transparent p-0"
                            : message.senderId === localStorage.getItem("userId")
                              ? "bg-gradient-to-r from-purple-500 to-indigo-600 text-white"
                              : "bg-white border border-gray-100 text-gray-800"
                            }`}
                        >
                          {/* Image */}
                          {message.imageUrl && (
                            <div className="mb-2 rounded-lg overflow-hidden">
                              <img
                                src={message.imageUrl}
                                alt="sent media"
                                className="w-full max-h-60 object-cover rounded-lg"
                              />
                            </div>
                          )}

                          {/* Text */}
                          {message.content && (
                            <p className="leading-relaxed">{message.content}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>


          </div>}

          {/* Image preview */}
          {file && (
            <div className="px-6 py-3 bg-white border-t border-gray-100">
              <div className="relative inline-block">
                <img
                  src={URL.createObjectURL(file) || "/placeholder.svg"}
                  alt="preview"
                  className="max-h-40 rounded-lg object-cover border border-gray-200 shadow-sm"
                />
                {/* Close button */}
                <button
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 bg-white rounded-full text-gray-700 hover:text-red-500 shadow-md p-1 border border-gray-200 transition-colors"
                  title="Remove image"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Chat Input box area */}
          <div className="w-full border-t bg-white px-6 py-4 shadow-md">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                onClick={handleClick}
              >
                <Paperclip className="h-5 w-5" />
              </Button>
              {/* Hidden file input */}
              <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} accept="image/*" />
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Type a message..."
                  className="w-full rounded-full border border-gray-200 pl-5 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-sm"
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <Smile className="h-5 w-5" />
                </Button>
              </div>
              <Button
                size="icon"
                className="rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:opacity-90 shadow-md transition-all"
                onClick={handleSendMessage}
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col justify-center items-center min-h-screen bg-gradient-to-b from-gray-50 to-white p-6">
          <div className="text-center max-w-md mx-auto">
            <div className="mb-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-20 w-20 mx-auto text-gray-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <span>
              <Button className="cursor-pointer">
                Select A Chat
              </Button>
            </span>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">No conversation selected</h2>
            <p className="text-gray-500">Please select a chat from the sidebar to start messaging</p>
          </div>
        </div>
      )}
    </>
  )
}
