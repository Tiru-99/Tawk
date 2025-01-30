"use client"
import { useEffect } from "react";
import axios from 'axios';
import LeftBar from "@/components/LeftBar";
import ChatBox from "@/components/ChatBox";
import useAuth from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { Toaster , toast } from "sonner";

export default function Page(){

    const {isAuthenticated , isLoading} = useAuth(); 
    const router = useRouter(); 

    console.log("auth status" , isAuthenticated);

    useEffect(()=>{
        if(isAuthenticated === false && !isLoading){
            toast.error("You are not logged in");
            router.replace("/login");
        }
    },[isAuthenticated , isLoading])

    return(
        <>
            <Toaster position="top-center"></Toaster>
            <div className=" bg-gray-100">
                <div className="flex gap-3 m-2 w-full">
                    <div className="md:w-1/5 w-full">
                        <LeftBar></LeftBar>

                    </div>

                    <div className="hidden md:w-3/5 md:block">
                        <ChatBox></ChatBox>
                    </div>

                    <div className="md:w-1/5 hidden">

                    </div>
                </div>
            </div>
        </>
    )
}