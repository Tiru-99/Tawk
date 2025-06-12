"use client"

import type React from "react"

import FilterTabs from "./FilterTabs"
import { useState, useEffect, useMemo } from "react"
import { PeopleSheet } from "./SearchSheet"
import { CreateGroupDialog } from "./CreateGroupDialog"
import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar"
import { io } from "socket.io-client"
import { Loader2 } from "lucide-react"

interface ChatsType {
  id: string
  name: string | undefined
  isGroup: boolean
  latestMessage: string | undefined
  createdAt: Date
  users: UserDetailsType[]
}

interface UserDetailsType {
  userId: string
  username: string
  profile_pic: string
}

type LeftBarProps = {
  selectedChat: string
  setSelectedChat: React.Dispatch<React.SetStateAction<string>>
}

export default function LeftBar({ selectedChat, setSelectedChat }: LeftBarProps) {
  const socket = useMemo(
    () =>
      io(`${process.env.NEXT_PUBLIC_BACKEND_URL}`, {
        withCredentials: true
      }),
    [],
  )
  console.log("Connecting to socket at:", process.env.NEXT_PUBLIC_BACKEND_URL);

  console.log("localstorage id ", localStorage.userId)
  const [chats, setChats] = useState<ChatsType[]>([])
  const [chat, setChat] = useState()
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [otherUserDetails, setOtherUserDetails] = useState({
    userId: "",
    username: "",
    profile_pic: "",
  })
  const [fetchAgain, setFetchAgain] = useState(false)
  const [newChat, setNewChat] = useState<ChatsType>()

  useEffect(() => {
    const loggedInUser = localStorage.userId

    setIsLoading(true);
    socket.emit("get-chats", loggedInUser)
    console.log(loggedInUser)

    socket.on("get-all-chats", (chats: ChatsType[]) => {
      setChats(chats);
      setIsLoading(false);
    })

    socket.on("new-chat-added", (newChat) => {
      setChat(newChat)
      console.log("SearchSheet component me chat aagya", newChat)
    })

    return () => {
      socket.off("new-chat-added")
    }

    // axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/chat/getChats/${loggedInUser}`)
    // .then((res) => {
    //     setChats(res.data.data);
    // })
    // .catch((error)=>{
    //   console.log("Something went wrong" , error );
    // })
  }, [socket, fetchAgain])

  useEffect(() => {
    if (newChat) {
      const newChatWithOtherUserName = { ...newChat, name: getOtherUserName(newChat) }
      setChats((prevState) => [...prevState, newChatWithOtherUserName])
    }
  }, [newChat])

  //function to pass new chat from child to parent
  const handleNewChat = (newChat: ChatsType) => {
    setNewChat(newChat)
    console.log("new chat :", newChat)
  }

  console.log("Chats", chats)

  //utility function to get the name of the other single chat
  const getOtherUserName = (chat: ChatsType) => {
    if (chat.isGroup || chat.name != null) return chat.name

    const userId = localStorage.userId

    const filteredChat = chat.users.filter((user) => user.userId !== userId)
    console.log("This is the filteredChat", filteredChat)
    return filteredChat[0]?.username
  }

  const getOtherProfilePic = (chat: ChatsType) => {
    if (chat.isGroup || chat.name != null) return chat.name

    const userId = localStorage.userId

    const filteredChat = chat.users.filter((user) => user.userId !== userId)
    console.log("This is the filteredChat", filteredChat)
    return filteredChat[0]?.profile_pic
  }

  const convertTimeToReadableFormat = (time: Date) => {
    // Create a Date object from the ISO string
    const date = new Date(time)

    // Extract hours and minutes
    let hours = date.getHours()
    const minutes = date.getMinutes()

    // Determine AM or PM
    const ampm = hours >= 12 ? "PM" : "AM"

    // Convert to 12-hour format
    hours = hours % 12
    hours = hours || 12 // Handle midnight (0 hours)

    // Format minutes to always be two digits
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes

    // Combine into the final readable time string
    return `${hours}:${formattedMinutes} ${ampm}`
  }
  console.log("image", localStorage.profile_pic)

  return (
    <>
      <div className="p-5 w-full bg-white h-screen overflow-hidden flex flex-col">
        {/* Profile Section */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <Avatar className="relative h-12 w-12 rounded-full overflow-hidden border-2 border-gray-100 shadow-sm">
              <AvatarImage
                src={localStorage.getItem("profile_pic") || ""}
                alt="User Profile"
                className="h-full w-full object-cover"
              />
              <AvatarFallback className="absolute inset-0 flex items-center justify-center text-center font-semibold text-white bg-gradient-to-br from-blue-500 to-indigo-600">
                {localStorage.getItem("username")?.slice(0, 2).toUpperCase() || "AB"}
              </AvatarFallback>
            </Avatar>

            {/* User Info */}
            <div className="flex flex-col justify-center">
              <h2 className="text-md font-semibold tracking-tight">{localStorage.username}</h2>
              <p className="text-xs text-gray-500">Online</p>
            </div>
          </div>

          {/* Search Icon */}
          <div className="flex items-center gap-3">
            <PeopleSheet socket={socket} sendChatToParent={() => handleNewChat}></PeopleSheet>
            <CreateGroupDialog setFetchAgain={setFetchAgain}></CreateGroupDialog>
          </div>
        </div>

        <div className="mb-4">
          <FilterTabs></FilterTabs>
        </div>

        {/* Chats and Latest Message Section */}
        {/* Chats and Latest Message Section */}
        <div className="mt-2 flex-1 overflow-y-auto pr-1">
          <p className="text-xs font-medium uppercase text-gray-500 mb-3 tracking-wider">Messages</p>

          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="animate-spin w-6 h-6 text-gray-500" />
            </div>
          ) : (
            <div className="space-y-2">
              {chats.map((chat, index) => (
                <div
                  key={index}
                  className={`flex justify-between items-center p-3 rounded-xl transition-all duration-200 cursor-pointer ${selectedChat === chat.id
                      ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 shadow-sm"
                      : "hover:bg-gray-50"
                    }`}
                  onClick={() => setSelectedChat(chat.id)}
                >
                  {/* Avatar */}
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 flex items-center justify-center rounded-full overflow-hidden border border-gray-200 shadow-sm">
                      {getOtherProfilePic(chat) ? (
                        <img
                          className="w-full h-full object-cover"
                          src={`${getOtherProfilePic(chat)}`}
                          alt="Profile"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-indigo-600 text-white font-semibold">
                          {getOtherUserName(chat)?.toString().slice(0, 2).toUpperCase() || "BC"}
                        </div>
                      )}
                    </div>

                    {/* Chat Info */}
                    <div className="flex flex-col">
                      <h2 className="text-sm font-medium tracking-tight">{getOtherUserName(chat)}</h2>
                      <p className="text-xs text-gray-500 line-clamp-1">
                        {chat.latestMessage && chat.latestMessage.length > 25
                          ? chat.latestMessage?.slice(0, 25) + "..."
                          : chat.latestMessage}
                      </p>
                    </div>
                  </div>

                  {/* Time */}
                  <div className="flex flex-col items-end">
                    <p className="text-xs font-medium text-gray-500">
                      {convertTimeToReadableFormat(chat.createdAt)}
                    </p>
                    {index % 3 === 0 && (
                      <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-500 rounded-full mt-1">
                        {Math.floor(Math.random() * 5) + 1}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </>
  )
}
