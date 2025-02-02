"use client"

import { useEffect , useState , useMemo , useRef } from "react"
import { Phone, Video, MoreVertical, Check , Smile , Send , Paperclip } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import axios from 'axios';
import {io} from 'socket.io-client';


interface Message {
  id: number
  sender: string
  avatar: string
  content: string
  time: string
  isUser?: boolean
  images?: string[]
}

interface MessageProps {
  id : string  
  content : string 
  createdAt : Date 
  senderId : string 
  chatId : string 
  user : MessageUserProps
}

interface MessageUserProps {
  userId : string 
  username : string 
  profile_pic : string
}

type ChatBoxProps = {
  selectedChat : string 
}

export default function ChatBox({selectedChat} : ChatBoxProps) {

  console.log("This is my selected chat" , selectedChat);
  
  const[messages , setMessages] = useState<MessageProps[]>([]);
  const[message , setMessage] = useState<string>("");
  const lastMessageRef = useRef<HTMLDivElement | null>(null);



  //use memo hook to initialise the socket only once 
  const socket = useMemo(() => {
    const newSocket = io(`${process.env.NEXT_PUBLIC_BACKEND_URL}`, {
      withCredentials: true,
    });

    newSocket.on("connect", () => {
      console.log("Connected to the socket server");
    });

    return newSocket;
  }, []);


  useEffect(()=> {
    if(!selectedChat) return ; 

    console.log("Selected Chat" , selectedChat);

    socket.emit("join-chat" , selectedChat);

      // Fetch messages when the chat is selected
      axios
      .get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/message/getmessages/${selectedChat}`)
      .then((res) => {
        console.log("The code is coming here")
        setMessages(res.data.data);
        console.log("this is my user details " , res.data.data.user);
        console.log("Fetched messages: ", res.data.data);
      })
      .catch((error) => {
        console.log("Error fetching messages: ", error);
      });

       // Handle incoming messages
    const handleNewMessage = (newMessage:MessageProps) => {
      console.log("Received new message:", newMessage);
      
      setMessages((prevMessages) => [...prevMessages, newMessage]);
    };

    socket.on("new-message", handleNewMessage);
    //scroll to the last message 
   

    // Cleanup function to remove event listener when component unmounts
    return () => {
      socket.off("new-message", handleNewMessage);
    };
  } ,[selectedChat]);


  useEffect(()=> {
    //scroll to the last message 
    if(lastMessageRef.current){
      lastMessageRef.current.scrollIntoView({ behavior: "smooth" });
    }
  },[messages])


  const handleSendMessage = () => {
    if (!message.trim()) return;

    const dataToSend = {
      senderId: localStorage.userId,
      content: message,
      chatId: selectedChat,
    };

    socket.emit("send-message", dataToSend);
    setMessage(" "); // Clear input field
  };


  return (
    <>
    {selectedChat ? (
      < div className="flex h-screen flex-col bg-white relative ">
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
            {messages.length > 0 && messages.map((message) => (
                <div
                key={message.id}
                className={`flex gap-3 ${message.senderId === localStorage.userId ? "flex-row-reverse" : "flex-row"}`}
                ref={message === messages[messages.length - 1] ? lastMessageRef : null}
              >
                    {/* Avatar */}
                    <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-200 shrink-0">
                    <Image
                        src="/man.jpg"
                        alt={`madarchod's avatar`}
                        className="object-cover w-full h-full"
                        width={40}
                        height={40}
                    />
                    </div>

                    {/* Message Content */}
                    <div className={`max-w-[70%] ${message.senderId === localStorage.userId ? "text-right" : ""}`}>
                    <div className="flex items-center gap-2">
                    
                      <span className="text-sm font-medium">
                        {message.senderId === localStorage.userId
                          ? "You"
                          : message.user.username}
                      </span>
                    
                        <span className="text-xs text-gray-500">9:45</span>
                        {message.senderId === localStorage.userId && <Check className="h-4 w-4 text-blue-500" />}
                    </div>
                    <div
                        className={`mt-1 rounded-2xl px-4 py-2 ${
                        message.senderId === localStorage.userId ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-900"
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
              onChange={(e)=> {setMessage(e.target.value)}}
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
          <Button size="icon" className="rounded-full bg-blue-500 text-white hover:bg-blue-600"
           onClick={handleSendMessage}>
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
    ) :(
      <div className="flex justify-center items-center min-h-screen">
        <div>
          Please select a chat to start chatting
        </div>
      </div>
    )}
    
    </>
  )
}

