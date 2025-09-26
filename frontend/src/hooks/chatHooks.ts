import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Chat } from "@/context/chatContext";


export const useGetChats = () => {
    const [isLoading, setIsLoading] = useState<Boolean>(false);
    const [chats, setChats] = useState<Chat[]>([]);

    //use callback to memoize the function
    const getAllChats = useCallback(async () => {
        try {
            setIsLoading(false);
            const userId = localStorage.getItem("userId");

            if (!userId) {
                return;
            }

            const res = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/chat/getchats/${userId}`, {
                withCredentials: true
            });

            setChats(res.data.chats);
        } catch (error) {
            console.log("Something went wrong", error);
            setIsLoading(false);
            toast.error("Something went wrong while fetching chats")
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        getAllChats()
    }, [getAllChats])

    return { isLoading, chats, setChats, refetch: getAllChats }
}

interface GropuChatProps {
    userIds : string[], 
    name : string , 
    adminId : string 
}

export const useCreateGroupChat = () => {
    const [isSubmitting, setIsSubmitting] = useState(false);


    const createGroupChat = async (data: GropuChatProps) => { 
        setIsSubmitting(true);
        try {
            await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/chat/groupchat`, data , {
                withCredentials : true
            }

            );
            toast.success("Successfully created the group chat !");
        } catch (error) {
            console.error("Something went wrong ", error);
            toast.error("Internal Server Error");
            setIsSubmitting(false)
        } finally {
            setIsSubmitting(false);
        }
    }

    return { createGroupChat , isSubmitting }
}