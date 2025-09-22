"use client"

import { createContext, useContext, useState } from "react";

const ChatContext = createContext<any>(null);


export interface ChatMessages {
  author :  {
    name : string ; 
    email : string ;
  } 
  authorId : string ; 
  content : string ; 
  id : string ;
  mediaUrl : string 
  type : "TEXT" | "MEDIA" | "CALL"
}

export interface Chat {
  id : string , 
  isGroupChat : boolean ; 
  latestMessage : string ; 
  latestMessageCreatedAt : string ; 
  name : string ;
  chatMessages : ChatMessages[]
}
export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const [selectedChat, setSelectedChat] = useState<Chat[]>([]);

  return (
    <ChatContext.Provider value={{ selectedChat, setSelectedChat }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);