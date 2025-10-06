"use client"
import { Input } from "./ui/input"
import { UserSheet } from "./UserSheet"
import { SearchIcon } from "lucide-react"
import Image from "next/image"
import { useChat, Chat } from "@/context/chatContext"
import { GroupDialog } from "./GroupDialog"
import { Navbar } from "./Navbar"
import { User , Users} from "lucide-react"
import { useResetUnseen } from "@/hooks/chatHooks"
import { ChatSidebarSkeleton } from "./ChatLoader"

export const ChatSidebar = () => {
    const { isLoading, chats, refetch } = useChat();

    if(isLoading){
        return  <ChatSidebarSkeleton/>
    }

    return (
        <>
            
            <div className="flex flex-col w-full h-full border border-gray-200 rounded-xl bg-white shadow-sm">
                {/* <h2 className="text-2xl pl-5 pt-3 font-semibold">Messages(4)</h2> */}
                {/* Top search + add user */}
                <div className="px-4 flex justify-center items-center gap-3 pt-4">
                    <div className="relative w-full">
                        <Input
                            placeholder="Search chats..."
                            className="w-full pr-10 border border-gray-200 rounded-full px-5 py-3 text-sm shadow-sm focus:ring-2 focus:ring-gray-200 focus:outline-none"
                        />
                        <SearchIcon className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer h-5 w-5 transition-colors" />
                    </div>

                    <UserSheet onAddChat={refetch} />
                    <GroupDialog onAddChat={refetch} />
                </div>

                {/* Chat list */}
                <div className="mt-3 flex-1 overflow-y-auto">
                    {chats && chats.map((chat: Chat, index: number) => (
                        <ChatCard chat={chat} key={index} />
                    ))}
                </div>

                <Navbar />

            </div>
        </>
    )
}


const ChatCard = ({ chat }: any) => {
    const { selectChat } = useChat();
    const { isGroupChat, latestMessage, latestMessageCreatedAt , unseenCount, name, otherImageUrl } = chat;
    const { resetUnseen } = useResetUnseen(); 
    
    const formatDate = (latestMessageCreatedAt: string) => {
        const date = new Date(latestMessageCreatedAt);

        return date.toLocaleDateString("en-US", {
            day: "2-digit",
            month: "short",
        });
    };


    const handleChatSelect = () => {
        selectChat(chat);
        //send api request to reduce the  unseen count to zero 
        const userId = localStorage.getItem("userId");
        if(!userId ){
            return ; 
        }

        const dataToSend = {
            userId , 
            chatId : chat.id
        }

        resetUnseen(dataToSend)
        //optimistic update
        chat.unseenCount = 0 ; 
    }

    const latestTime = formatDate(latestMessageCreatedAt)

    return (
        <>
            <div
                className="flex justify-between items-center p-4 border-b border-gray-100 mx-3 cursor-pointer hover:bg-gray-50 rounded-lg transition-all duration-200"
                onClick={handleChatSelect}
            >
                <div className="flex gap-3 items-center">
                    <div className="relative w-12 h-12">
                        {otherImageUrl ? (
                            <Image
                                src={otherImageUrl }
                                alt="profile"
                                fill
                                className="rounded-full object-cover shadow-sm"

                            />
                        ) : (
                            <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center shadow-sm">
                                {isGroupChat ? (
                                    <Users className="w-6 h-6 text-gray-500" />  // 👥 group chat icon
                                ) : (
                                    <User className="w-6 h-6 text-gray-500" />   // 👤 single user icon
                                )}
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col justify-center">
                        <h3 className="font-medium text-gray-900 text-sm">{name}</h3>
                        <p className="text-gray-500 text-xs truncate max-w-[180px]">{latestMessage}</p>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                    <p className="text-xs text-gray-400">{latestTime}</p>
                    {unseenCount > 0 && (
                        <span className="bg-gradient-to-r from-gray-800 to-gray-600 text-white rounded-full min-w-[20px] min-h-[20px] px-1.5 flex items-center justify-center text-[10px] font-medium shadow-sm">
                            {unseenCount}
                        </span>
                    )}
                </div>
            </div>
        </>
    )
}
