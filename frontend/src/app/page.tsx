"use client"
import HomePage from "@/components/Homepage";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { ChatProvider } from "@/context/chatContext";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
export default function Home() {
    const { isLoading } = useAuth();


    if (isLoading) {
        return <div>Loading...</div>
    }

    return (
        <>
            <ChatProvider>
                <HomePage />
            </ChatProvider>
        </>
    )
}