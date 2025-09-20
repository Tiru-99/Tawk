import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";

export const useGetChats = () => {
    const [isLoading, setIsLoading] = useState<Boolean>(false);
    const [chats, setChats] = useState([]);
    
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
        },[])

        useEffect(() => {
            getAllChats()
        } , [getAllChats])

    return { isLoading, chats , refetch : getAllChats }
}
