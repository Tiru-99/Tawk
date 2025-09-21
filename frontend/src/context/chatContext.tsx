"use client"

import { createContext, useContext, useState } from "react";

const ChatContext = createContext<any>(null);

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const [selectedChat, setSelectedChat] = useState<any>(null);

  return (
    <ChatContext.Provider value={{ selectedChat, setSelectedChat }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);