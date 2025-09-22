"use client"
import { createContext, useContext, useState, useMemo, useEffect } from "react";
import { io } from "socket.io-client"
import { useGetChats } from "@/hooks/chatHooks";

const ChatContext = createContext<any>(null);

export interface ChatMessages {
  author: {
    name: string;
    email: string;
  },
  chatId: string;
  authorId: string;
  content: string;
  id: string;
  mediaUrl: string
  type: "TEXT" | "MEDIA" | "CALL"
}

export interface Chat {
  id: string,
  isGroupChat: boolean;
  latestMessage: string;
  latestMessageCreatedAt: string;
  name: string;
  chatMessages: ChatMessages[];
  unseenCount?: number; // Add unseen count
}

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const { chats, setChats, isLoading, refetch } = useGetChats();

  //create socket once 
  const socket = useMemo(() => {
    return io(process.env.NEXT_PUBLIC_BACKEND_URL!, { withCredentials: true })
  }, []);

  useEffect(() => {
    if (!socket || !chats || chats.length === 0) return;

    console.log("Joining all chat rooms for user");
    
    chats.forEach((chat) => {
      socket.emit("join-chat", chat.id);
    });

  }, [socket, chats]);

  useEffect(() => {
    if (!socket) return;

    const messageHandler = (messageData: ChatMessages) => {
      console.log("Message received on the frontend", messageData, chats);

      // Update the chats list for all users 
      setChats((prevChats: Chat[]) =>
        prevChats.map((chat) => {
          if (chat.id === messageData.chatId) {
            const isCurrentlySelected = selectedChat?.id === chat.id;
            return {
              ...chat,
              chatMessages: [...(chat.chatMessages || []), messageData],
              latestMessage: messageData.content,
              latestMessageCreatedAt: new Date().toISOString(),
              // Only increment unseen count if this chat is not currently selected
              unseenCount: isCurrentlySelected ? 0 : (chat.unseenCount || 0) + 1,
            };
          }
          return chat;
        })
      );

      // Update selected chat if the message belongs to currently selected chat
      setSelectedChat((prevChat: Chat | null) => {
        if (!prevChat || prevChat.id !== messageData.chatId) {
          return prevChat; // Don't update if no chat selected or different chat
        }

        return {
          ...prevChat,
          chatMessages: [...(prevChat.chatMessages || []), messageData],
          latestMessage: messageData.content,
          latestMessageCreatedAt: new Date().toISOString(),
        };
      });
    };

    socket.on("new-message", messageHandler);

    return () => {
      socket.off("new-message", messageHandler);
    }
  }, [socket, selectedChat?.id]);

  // Function to select a chat and reset unseen count
  const selectChat = (chat: Chat) => {
    setSelectedChat(chat);
    
    // Reset unseen count for the selected chat
    setChats((prevChats: Chat[]) =>
      prevChats.map((c) =>
        c.id === chat.id
          ? { ...c, unseenCount: 0 }
          : c
      )
    );

    // // Optionally emit an event to mark messages as read on the server
    // socket.emit("mark-chat-as-read", chat.id);
  };

  return (
    <ChatContext.Provider value={{ 
      selectedChat, 
      setSelectedChat, 
      selectChat, 
      socket, 
      chats, 
      setChats, 
      isLoading, 
      refetch 
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);