'use client'
import { Filter, Search } from "lucide-react";
import FilterTabs from "./FilterTabs";
import { useState , useEffect , useMemo} from "react";
import { Dispatch , SetStateAction } from "react";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { PeopleSheet } from "./SearchSheet";
import axios from 'axios';
import { io } from "socket.io-client";

interface ChatsType {
  id : string 
  name : String | undefined 
  isGroup : Boolean
  latestMessage : String | undefined
  createdAt : Date
  users : UserDetailsType[]
}

interface UserDetailsType {
  userId : String , 
  username : String
}

type LeftBarProps = {
  selectedChat : string  , 
  setSelectedChat : React.Dispatch<React.SetStateAction<string>>;
}

export default function LeftBar({selectedChat , setSelectedChat} : LeftBarProps) {

  const socket = useMemo(() => {
    const newSocket = io(`${process.env.NEXT_PUBLIC_BACKEND_URL}`, {
      withCredentials: true,
    });

    newSocket.on("connect", () => {
      console.log("Connected to the socket server");
    });

    return newSocket;
  }, []);

  const[chats , setChats] = useState<ChatsType[]>([]);

  useEffect(()=>{
    const loggedInUser = localStorage.userId; 
    console.log(loggedInUser);
    axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/chat/getChats/${loggedInUser}`)
    .then((res) => {
        setChats(res.data.data);
    })
    .catch((error)=>{
      console.log("Something went wrong" , error );
    })
  } , [])


  //utility function to get the name of the other single chat
  const getOtherUserName = (chat : ChatsType) => {
   if(chat.isGroup || chat.name != null ) return chat.name ; 

   const userId = localStorage.userId ; 

   const filteredChat = chat.users.filter((user)=>user.userId !== userId);
   return filteredChat[0].username ;
   
  }


  const convertTimeToReadableFormat = (time : Date) =>{
     // Create a Date object from the ISO string
      const date = new Date(time);

      // Extract hours and minutes
      let hours = date.getHours();
      const minutes = date.getMinutes();

      // Determine AM or PM
      const ampm = hours >= 12 ? "PM" : "AM";

      // Convert to 12-hour format
      hours = hours % 12;
      hours = hours || 12; // Handle midnight (0 hours)

      // Format minutes to always be two digits
      const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;

      // Combine into the final readable time string
      return `${hours}:${formattedMinutes} ${ampm}`;
  }

  return (
    <>
      <div className="p-4 border-gray-300 rounded-md border-[1px] w-full bg-white h-screen">
        {/* Profile Section */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="h-12 w-12 flex justify-center items-center rounded-full bg-gray-200">
              <div className="text-center font-semibold">AB</div>
            </div>

            {/* User Info */}
            <div className="flex flex-col justify-center">
              <h2 className="text-md tracking-tight">Aayush</h2>
              <p className="text-xs text-gray-500">Info Account</p>
            </div>
          </div>

          {/* Search Icon */}
          <div className="flex items-center">
           <PeopleSheet></PeopleSheet>
            
          </div>
        </div>

        
            <FilterTabs></FilterTabs>
       

        {/* Chats and Latest Message Section */}
        <div className="mt-4">
            <p className="text-gray-500 font-light mb-3 ">Messages</p>
            {chats.map(( chat , index)=>(
                <div 
                 key={index}
                 className={`flex justify-between items-center mb-6 cursor-pointer ${selectedChat === chat.id  ? "bg-blue-100" : "hover:bg-gray-100"} `}
                 onClick={()=> setSelectedChat(chat.id)}>
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="w-12 h-12 flex items-center justify-center rounded-full bg-gray-200">
                    <div className="text-center font-semibold">BC</div>
                  </div>
    
                  {/* Chat Info */}
                  <div className="flex flex-col">
                    <h2 className="text-sm tracking-tight">{getOtherUserName(chat)}</h2>
                    <p className="text-xs text-gray-500">{chat.latestMessage}</p>
                  </div>
                </div>
    
                {/* Time */}
                <p className="text-xs text-gray-400">{convertTimeToReadableFormat(chat.createdAt)}</p>
              </div>
            ))}
        </div>
      </div>
    </>
  );
}
