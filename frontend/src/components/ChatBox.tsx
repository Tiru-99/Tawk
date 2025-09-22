"use client"
import { useMemo, useEffect, useState, useRef } from "react"
import Image from "next/image"
import { Video } from "lucide-react"
import { Input } from "./ui/input"
import { Message } from "./Message"
import { Smile, PlusIcon, Send, X } from "lucide-react"
import { useChat } from "@/context/chatContext"
import { io } from "socket.io-client";
import { toast } from "sonner";
import { ChatMessages, Chat } from "@/context/chatContext"

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
    }


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

        console.log("The email is", email);

        const author = {
            email,
            name
        }

        try {
            if (file) {
                // Handle file upload first
                handleFileSubmit();
                return; // handleFileSubmit will handle the message sending
            }

            // For normal text messages 
            const message = {
                author,
                type: "TEXT",
                content: messageContent.trim(),
                authorId,
                mediaUrl: "",
                chatId: selectedChat?.id
            }

            socket.emit("send-message", message);
            clearMessageInput();

            // Note: setSubmitLoading(false) will be called when socket responds with "message-sent" or "message-error"
        } catch (error) {
            toast.error("Failed to send message");
            console.error("Message send error:", error);
        }
    }

    const handleFileSubmit = () => {
        //send request to aws and then trigger socket 
    }


    if (!selectedChat) {
        return (
            <div>
                Please Select a chat
            </div>
        )
    }

    return (
        <>
            {/* Header */}
            <div className="flex flex-col h-full border border-gray-300 rounded-md relative">
                <div className="flex justify-between p-3 border-b border-gray-300">
                    <div className="flex gap-3 items-center">
                        <div className="h-12 w-12 relative rounded-full">
                            <Image
                                src={selectedChat.otherImageUrl ?? "/man.jpg"}
                                alt="image"
                                fill
                                className="object-cover rounded-full ">
                            </Image>
                        </div>
                        <div className="flex flex-col">
                            <p className="text-lg font-semibold">{selectedChat.name}</p>
                        </div>
                    </div>

                    <div className="flex items-center">
                        <span className="mr-4 cursor-pointer hover:bg-gray-300/30 p-3 rounded-full"><Video /></span>
                    </div>
                </div>
                {/* //Chat Section will be here */}
                <div className="px-4 flex-1 pb-3 overflow-y-auto">
                    {selectedChat && selectedChat.chatMessages.map((message: ChatMessages, index: number) => (
                        <Message message={message} key={index} />
                    ))}

                    <div ref ={messageEndRef}></div>
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
                            onClick={() => {
                                fileInputRef.current?.click();
                                setInputDisabled(true)
                            }}>
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