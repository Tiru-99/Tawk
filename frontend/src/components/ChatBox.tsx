"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import { Phone, Video, MoreVertical, Check, Smile, Send, Paperclip } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import axios from 'axios';
import { io } from 'socket.io-client';


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
  id: string
  content: string
  imageUrl: string
  createdAt: Date
  senderId: string
  chatId: string
  user: MessageUserProps
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
  id: String
  name: String
  isGroup: boolean
  users: ChatUser[]
}

type ChatBoxProps = {
  selectedChat: string
}

export default function ChatBox({ selectedChat }: ChatBoxProps) {


  const [messages, setMessages] = useState<MessageProps[]>([]);
  const [message, setMessage] = useState<string>("");
  const [chatDetails, setChatDetails] = useState<ChatDetailsProps>();
  const lastMessageRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);


  const handleClick = () => {
    fileInputRef.current?.click();
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputFile = e.target.files?.[0];

    if (!inputFile) {
      return;
    }

    console.log("The selected file is", inputFile);
    setFile(inputFile);
  }

  const removeImage = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }



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

  console.log("The messages are", messages);


  useEffect(() => {
    if (!selectedChat) return;

    console.log("Selected Chat", selectedChat);

    socket.emit("join-chat", selectedChat);

    // Fetch messages when the chat is selected
    axios
      .get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/message/getmessages/${selectedChat}/${localStorage.userId}`)
      .then((res) => {
        setMessages(res.data.data);
        setChatDetails(res.data.chatDetails);
        console.log("Fetched messages: ", res.data.data);
      })
      .catch((error) => {
        console.log("Error fetching messages: ", error);
      });


    // Handle incoming messages
    const handleNewMessage = (newMessage: MessageProps) => {
      console.log("Received new message:", newMessage);

      setMessages((prevMessages) => [...prevMessages, newMessage]);
      //call save message here 


    };

    socket.on("new-message", handleNewMessage);
    //scroll to the last message 

    // Cleanup function to remove event listener when component unmounts
    return () => {
      socket.off("new-message", handleNewMessage);
    };
  }, [selectedChat]);



  useEffect(() => {
    //scroll to the last message 
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages])


  const handleSendMessage = async () => {
    console.log("The code is reaching here part 1")
    const trimmedMessage = message.trim();
    if (!trimmedMessage && !file) return;

    const senderId = localStorage.getItem("userId");
    if (!senderId || !selectedChat) {
      console.error("Missing senderId or chatId");
      return;
    }

    console.log("The code is reaching here part 2 ")

    const messageData = {
      senderId,
      content: trimmedMessage,
      chatId: selectedChat,
      type: file ? "IMAGE" : "TEXT",
      imageUrl: ""
    }

    if (file) {
      console.log("the code is reaching here part 3");
      let imageUrl = ""
      try {
        const response = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/upload/get-presigned-url`, {
          params: {
            fileType: file.type
          }
        });

        const { key, url } = response.data;
        console.log("the key is " , key );
        console.log("The url is " , url);

        //upload file to s3 

        await axios.put(url, file, {
          headers: {
            "Content-Type": file.type,
          },
        });

        //get the stored object from s3 
        imageUrl = `https://${process.env.NEXT_PUBLIC_BUCKET_NAME}.s3.amazonaws.com/${key}`;
        messageData.imageUrl = imageUrl;
      } catch (error) {
        console.log("Something went wrong while uploading the image to s3 ", error);
        return;
      }
    }

    console.log("the code is reaching here part4")

    // Emit through socket for real-time updates
    socket.emit("send-message", messageData);

    // Optimistically update UI here if needed
    // addMessageToChat(messageData); // Optional function to update UI instantly

    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/message/send-message`,
        messageData
      );
    } catch (error) {
      console.error("Failed to save message:", error);
      // Optional: show toast or mark message as "unsynced"
    }

    setMessage(""); // Clear input
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
                  src={
                    !chatDetails?.isGroup
                      ? chatDetails?.users.find(u => u.user.id !== localStorage.getItem("userId"))?.user.profile_pic
                      ?? "/default-avatar.png"
                      : "/default-avatar.png"
                  }

                  alt="pic"
                  width={40}
                  height={40}
                  className="rounded-full"
                />

              </div>
              <div>
                <h1 className="font-semibold cursor-pointer">{chatDetails?.name}</h1>
                <p className="text-sm text-green-500">Tiru is typing...</p>
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
  {messages.length > 0 &&
    messages.map((message) => (
      <div
        key={message.id}
        className={`flex gap-3 ${message.senderId === localStorage.getItem("userId") ? "flex-row-reverse" : "flex-row"}`}
        ref={message === messages[messages.length - 1] ? lastMessageRef : null}
      >
        {/* Avatar */}
        <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-200 shrink-0">
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
          className={`max-w-[70%] ${
            message.senderId === localStorage.getItem("userId") ? "text-right" : ""
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {message.senderId === localStorage.getItem("userId")
                ? "You"
                : message.user?.username || "Unknown"}
            </span>
            <span className="text-xs text-gray-500">9:45</span>
            {message.senderId === localStorage.getItem("userId") && (
              <Check className="h-4 w-4 text-blue-500" />
            )}
          </div>

          <div
            className={`mt-1 rounded-2xl px-4 py-2 ${
              message.imageUrl
                ? "bg-transparent" // Or no background if it's an image
                : message.senderId === localStorage.getItem("userId")
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-900"
            }`}
          >

            {/* Image if available */}
            {message.imageUrl && (
              <img
                src={message.imageUrl}
                alt="sent media"
                className="rounded-lg max-w-full max-h-60 object-cover mb-2"
              />
            )}
            {/* Text content if available */}
            {message.content && <p>{message.content}</p>}
          </div>
        </div>
      </div>
    ))}
</div>

          </div>

          {/* Chat Input box area  */}

          {/* ✅ Image preview */}

          {file && (
            <div className="px-4 py-2 sticky bottom-4 left-0 z-50">
              <div className="relative inline-block">
                <img
                  src={URL.createObjectURL(file)}
                  alt="preview"
                  className="max-h-40 rounded-md object-cover border"
                />
                {/* Close button */}
                <button
                  onClick={removeImage}
                  className="absolute top-1 right-1 bg-white rounded-full text-gray-700 hover:text-red-500 shadow p-1"
                  title="Remove image"
                >
                  ✕
                </button>
              </div>
            </div>
          )}


          <div className="sticky bottom-0 left-0 w-full border-t bg-white px-4 py-3 ">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-500"
                onClick={handleClick}
              >
                <Paperclip className="h-5 w-5" />
              </Button>
              {/* Hidden file input  */}
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Type a message..."
                  className="w-full rounded-full border border-gray-300 pl-4 pr-12 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onChange={(e) => { setMessage(e.target.value) }}
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
      ) : (
        <div className="flex justify-center items-center min-h-screen">
          <div>
            Please select a chat to start chatting
          </div>
        </div>
      )}

    </>
  )
}

