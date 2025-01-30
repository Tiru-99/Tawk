import { Filter, Search } from "lucide-react";
import FilterTabs from "./FilterTabs";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { PeopleSheet } from "./SearchSheet";

interface ChatsType {
  id : String 
  name : String | undefined 
  isGroup : Boolean
  latestMessage : String
}

export default function LeftBar() {

  const[chats , setChats] = useState<ChatsType[]>([])


    const chatss = [
        {
            id: 1,
            name: "Bhindi Chor",
            avatar: "BC",
            lastMessage: "Hi, this is the latest...",
            time: "9:12 AM",
        },

        {
            id: 2,
            name: "Aayush",
            avatar: "AY",
            lastMessage: "How are you?",
            time: "10:15 AM",
        },

        {
            id: 3,
            name: "Tiru",
            avatar: "AY",
            lastMessage: "Hello Sexy?",
            time: "10:15 AM",
        },

        {
            id: 4,
            name: "Advait",
            avatar: "AY",
            lastMessage: "Hi Ice Cream khane...",
            time: "10:15 AM",
          },

          {
            id: 5,
            name: "Mandar",
            avatar: "AY",
            lastMessage: "Mi Busy aahe majhy...",
            time: "10:15 AM",
          },
        // Add more chats as needed
      ];

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
            {chatss.map(( chat , index)=>(
                <div key={index} className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="w-12 h-12 flex items-center justify-center rounded-full bg-gray-200">
                    <div className="text-center font-semibold">BC</div>
                  </div>
    
                  {/* Chat Info */}
                  <div className="flex flex-col">
                    <h2 className="text-sm tracking-tight">{chat.name}</h2>
                    <p className="text-xs text-gray-500">{chat.lastMessage}</p>
                  </div>
                </div>
    
                {/* Time */}
                <p className="text-xs text-gray-400">{chat.time}</p>
              </div>
            ))}
        </div>
      </div>
    </>
  );
}
