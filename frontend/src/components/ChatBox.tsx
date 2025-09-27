"use client"
import {  useEffect, useState, useRef } from "react"
import Image from "next/image"
import { Video } from "lucide-react"
import { Input } from "./ui/input"
import { Message } from "./Message"
import { Smile, PlusIcon, Send, X } from "lucide-react"
import { useChat } from "@/context/chatContext"
import axios from "axios"
import { toast } from "sonner";
import { ChatMessages } from "@/context/chatContext"
import { v4 as uuidv4 } from 'uuid';
import { User , Users } from "lucide-react"

export const ChatBox = () => {
    const { selectedChat, socket } = useChat();
    const [messageContent, setMessageContent] = useState("");
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const messageEndRef = useRef<HTMLDivElement | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [imageUrl, setImageUrl] = useState("");
    const [inputDisabled, setInputDisabled] = useState<boolean>(false);


    //scroll to bottom
    useEffect(() => {
        messageEndRef.current?.scrollIntoView({ behavior: "auto" });
    }, [selectedChat?.chatMessages]);



    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const fileToSend = e.target.files?.[0];
        if (!fileToSend) return;
        setFile(fileToSend);
        const imgUrl = URL.createObjectURL(fileToSend);
        setImageUrl(imgUrl);
        setInputDisabled(true);
    }

    const handleClick = () => {
        if (!fileInputRef.current) return;

        fileInputRef.current.click();

        let fileSelected = false;

        const onFileChange = () => {
            fileSelected = true;
            setInputDisabled(true); // Disable because file was selected
            fileInputRef.current?.removeEventListener('change', onFileChange);
        };

        const onFocus = () => {
            // Small delay to ensure change event fires first if file was selected
            setTimeout(() => {
                if (!fileSelected) {
                    setInputDisabled(false); // Keep enabled because user canceled
                }
            }, 100);
            window.removeEventListener("focus", onFocus);
        };

        fileInputRef.current.addEventListener('change', onFileChange);
        window.addEventListener("focus", onFocus);
    };

    const clearMessageInput = () => {
        setMessageContent("");
        setFile(null);
        setImageUrl("");
        setInputDisabled(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }

    const handleMessageSubmit = async () => {
        // Validation
        if (!file && !messageContent.trim()) {
            toast.error("Message cannot be empty");
            return;
        }

        const authorId = localStorage.getItem("userId");
        const email = localStorage.getItem("email");
        const name = localStorage.getItem("name");
        const imageUrl = localStorage.getItem("imageUrl");

        if (!authorId || !email || !name ||!imageUrl) {
            return;
        }

        const author = {
            email,
            name ,
            imageUrl
        }

        try {
            if (file) {
                // Handle file upload first
                handleFileSubmit(file, author, authorId);
                return; // handleFileSubmit will handle the message sending
            }

            // For normal text messages 
            const message = {
                author,
                type: "TEXT",
                content: messageContent.trim(),
                authorId,
                mediaUrl: "",
                chatId: selectedChat?.id,
                createdAt : Date.now()
            }

            socket.emit("send-message", message);
            clearMessageInput();

            // Note: setSubmitLoading(false) will be called when socket responds with "message-sent" or "message-error"
        } catch (error) {
            toast.error("Failed to send message");
            console.error("Message send error:", error);
        }
    }

    const handleFileSubmit = async (file: File, author: any, authorId: string) => {
        //send request to aws and then trigger socket 
        let imageUrl = ""
        try {
            const response = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/upload/get-presigned-url`, {
                params: {
                    fileType: file.type,
                },
            })

            const { key, url } = response.data

            //upload file to s3
            await axios.put(url, file, {
                headers: {
                    "Content-Type": file.type,
                },
            })

            //get the stored object from s3
            imageUrl = `https://${process.env.NEXT_PUBLIC_BUCKET_NAME}.s3.amazonaws.com/${key}`

            const message = {
                author,
                type: "MEDIA",
                content: "",
                authorId,
                mediaUrl: imageUrl,
                chatId: selectedChat?.id,
                createdAt : Date.now()
            }

            socket.emit("send-message", message);
            clearMessageInput();

        } catch (error) {
            console.log("Something went wrong while uploading the image to s3 ", error)
            return
        }

    }

    const handleVideoCall = () => {
        //get a uuid 
        const videoCallUrl = uuidv4();
        //create a message 
        const authorId = localStorage.getItem("userId");
        const email = localStorage.getItem("email");
        const name = localStorage.getItem("name");
        const imageUrl = localStorage.getItem("imageUrl");
        

        if (!authorId || !email || !name) {
            return;
        }

        const author = {
            email,
            name , 
            imageUrl 
        }

        const message = {
            author,
            type: "CALL",
            content: "",
            authorId,
            mediaUrl: "",
            callUrl: videoCallUrl,
            chatId: selectedChat?.id,
            createdAt : Date.now()

        }
        // call socket client 
        socket.emit("send-message", message)
    }


    if (!selectedChat) {
        return (
            <div className="flex justify-center items-center h-full">
                <h1 className="font-bold text-5xl text-gray-400"> PLEASE SELECT A CHAT </h1>
            </div>
        )
    }

    console.log("The imageUrl is " , selectedChat.otherImageUrl)

    return (
        <>
            {/* Header */}
            <div className="flex flex-col h-full border border-gray-200 rounded-md relative shadow-sm ">
                <div className="flex justify-between p-3 border-b border-gray-300">
                    <div className="flex gap-3 items-center">
                        <div className="h-12 w-12 relative rounded-full">
                            {selectedChat.otherImageUrl ? (
                            <Image
                                src={selectedChat.otherImageUrl}
                                alt="profile"
                                fill
                                className="rounded-full object-cover shadow-sm"

                            />
                        ) : (
                            <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center shadow-sm">
                                {selectedChat.isGroupChat ? (
                                    <Users className="w-6 h-6 text-gray-500" />  // 👥 group chat icon
                                ) : (
                                    <User className="w-6 h-6 text-gray-500" />   // 👤 single user icon
                                )}
                            </div>
                        )}
                        </div>
                        <div className="flex flex-col">
                            <p className="text-lg text-gray-800 font-semibold">{selectedChat.name}</p>
                        </div>
                    </div>

                    <div className="flex items-center"
                        onClick={handleVideoCall}>
                        <span className="mr-4 cursor-pointer hover:bg-gray-300/30 p-3 rounded-full"><Video /></span>
                    </div>
                </div>
                {/* //Chat Section will be here */}
                <div className="px-4 flex-1 pb-3 overflow-y-auto">
                    {selectedChat && selectedChat.chatMessages == 0 &&
                        <div className="flex justify-center items-center text-gray-400 h-full text-3xl">
                            <i>Start a conversation</i>
                        </div>}
                    {selectedChat && selectedChat.chatMessages.map((message: ChatMessages, index: number) => (
                        <Message message={message}  key={index} />
                    ))}

                    <div ref={messageEndRef}></div>
                </div>

                {/* file preview */}

                {imageUrl && (
                    <div className="absolute bottom-24 left-4">
                        <div className="relative h-48 w-40 rounded-lg overflow-hidden shadow-lg">
                            <Image
                                src={imageUrl}
                                alt="selected image"
                                fill
                                className="object-cover"
                            />
                            {/* Close button */}
                            <button
                                onClick={() => {
                                    setImageUrl("")
                                    setFile(null)
                                    setInputDisabled(false)
                                    if (fileInputRef.current) {
                                        fileInputRef.current.value = "";
                                    }
                                }}
                                className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* ChatBox Component */}
                <div className=" border-t border-gray-300">
                    <div className="flex p-4 gap-2">
                        <div className="relative w-full">
                            <Input
                                className="w-full pl-12 py-6 focus:outline-none focus:ring-0 focus-visible:ring-0
                                border shadow-none border-gray-300 bg-gray-50 rounded-full"
                                placeholder="Enter message"
                                disabled={inputDisabled}
                                onChange={(e) => {
                                    setMessageContent(e.target.value)
                                }}
                                value={messageContent}
                            />
                            <Smile
                                className="absolute left-[1%] bottom-[26%]  cursor-pointer text-gray-400"
                            />
                        </div>

                        {/* hidden input */}
                        <input
                            type="file"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                        ></input>

                        <div className="p-3 cursor-pointer rounded-full border border-gray-300 bg-gray-50 flex justify-center items-center"
                            onClick={handleClick}>
                            <PlusIcon className="text-gray-600" />
                        </div>

                        <button
                            className={`p-3 cursor-pointer rounded-full flex justify-center items-center bg-blue-400`}
                            onClick={handleMessageSubmit}
                        >
                            <Send className="text-white" />
                        </button>

                    </div>
                </div>
            </div>
        </>
    )
}