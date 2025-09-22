"use client"
import { Input } from "./ui/input"
import { UserSheet } from "./UserSheet"
import { SearchIcon } from "lucide-react"
import Image from "next/image"
import { useChat, Chat } from "@/context/chatContext"

export const ChatSidebar = () => {
    const { isLoading, chats, refetch } = useChat();
    console.log("The chats are ", chats);



    return (
        <>
            <div className="w-full h-full border border-gray-300 rounded-md">
                <div className="px-4 flex justify-center items-center gap-3 mt-4">
                    <div className="relative w-full">
                        <Input
                            placeholder="Search Chats"
                            className="w-full pr-10 focus:outline-none focus:ring-0 focus-visible:ring-0 border shadow-none border-gray-300 rounded-full p-5"
                        />
                        <SearchIcon className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer h-5 w-5" />
                    </div>

                    <UserSheet onAddChat={refetch} />
                </div>
                <div className="mt-3">
                    {chats && chats.map((chat: Chat, index: number) => (
                        <ChatCard chat={chat} key={index} />
                    ))}
                </div>
            </div>
        </>
    )
}


const ChatCard = ({ chat }: any) => {
    const { setSelectedChat , selectChat } = useChat();
    const { admin, isGroupChat, latestMessage, latestMessageCreatedAt, participants, unseenCount, name, otherImageUrl } = chat;

    const formatDate = (latestMessageCreatedAt: string) => {
        const date = new Date(latestMessageCreatedAt);

        // Format: "22 Sep"
        return date.toLocaleDateString("en-US", {
            day: "2-digit",
            month: "short",
        });
    };

    const latestTime = formatDate(latestMessageCreatedAt)

    return (
        <>
            <div className="flex justify-between p-4 border-b border-b-gray-200 mx-3 cursor-pointer hover:bg-gray-50 rounded-lg"
                onClick={() => selectChat(chat)}>
                <div className="flex gap-3">
                    <div className="relative w-12 h-12 flex justify-center item-center">
                        <Image
                            src={otherImageUrl || "/man.jpg"}
                            alt="profile"
                            fill
                            className=" rounded-full object-cover"
                        />
                    </div>
                    <div className="flex flex-col justify-center">
                        <h3 className="font-semibold">{name}</h3>
                        <p className="text-gray-600">{latestMessage}</p>
                    </div>
                </div>

                <div className="flex flex-col gap-[10px]">
                    <p className="text-sm">{latestTime}</p>
                    <span className="bg-black text-white rounded-full w-5 font-semibold h-5 flex items-center justify-center text-xs">
                        2
                    </span>
                </div>
            </div>
        </>
    )
}