"use client"
import { useEffect , useState , useMemo } from "react";
import Navbar from "@/components/Navbar";
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


    const [selectedChat, setSelectedChat] = useState<string>("");

    return(
        <>
            <Navbar></Navbar>
            <Toaster position="top-center"></Toaster>
            <div className=" bg-gray-100">
                <div className="flex gap-3 m-2 w-full">
                    <div className="hidden md:block md:w-1/4 w-full">
                        <LeftBar  selectedChat = {selectedChat} setSelectedChat = {setSelectedChat}></LeftBar>

                    </div>

                    <div className="md:w-3/4 block w-full">
                        <ChatBox selectedChat = {selectedChat}></ChatBox>
                    </div>
                </div>
            </div>
        </>
    )
}