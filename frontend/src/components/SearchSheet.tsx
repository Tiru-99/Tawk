"use client"

import { useState , useEffect , useMemo, use} from "react"
import { Plus, Search , Loader2  } from "lucide-react"
import axios from "axios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { io, Socket } from "socket.io-client"


interface Person {
    id : String 
    username : String 
    email : String
}
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
  username : String , 
  profile_pic : String 
}

type PeopleSheetProps = {
  socket : Socket
  sendChatToParent : (chat : ChatsType) => void
}

export function PeopleSheet({socket , sendChatToParent} : PeopleSheetProps) {

  const [searchQuery, setSearchQuery] = useState("");
  const [people , setPeople] = useState<Person[]>([]);
  const [isLoading , setIsLoading] = useState(false);

  useEffect(()=>{
    setIsLoading(true)
    const userId = localStorage.userId; 
    axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/user/getusers/${userId}` , {
        withCredentials : true
    })
    .then((res)=>{
        setPeople(res.data.data);
        setIsLoading(false);
    })
    .catch((error)=>{
        setIsLoading(false);
        console.log("Error fetching users");
        
    })
    .finally(()=>{
        setIsLoading(false);
    })

  }, []);

  useEffect(() => {
    const handleNewChat = (newChat: ChatsType) => {
      console.log("new chat in the search sheet received : " , newChat);
      sendChatToParent(newChat); // ✅ Pass new chat to parent
    };

    socket.on("new-chat-added", handleNewChat);

    return () => {
      socket.off("new-chat-added", handleNewChat); // ✅ Cleanup listener
    };
  }, [socket, sendChatToParent]);


  const handleAddChatFriend = async(id : String , name : String) => {
    const loggedInUser = localStorage.userId ; 
    const loggedInUserUsername = localStorage.username ; 

    const dataToSend = {
      senderId : loggedInUser , 
      receiverId : id ,
      senderUsername : loggedInUserUsername,
      receiverUsername : name 
    }                 

    socket.emit("create-single-chat" , dataToSend);
  }




  // const handleAddChatFriend = async(id : String) => {
    
  //   const loggedInUser = localStorage.userId ; 
  //   const dataToSend = {
  //     senderId : loggedInUser , 
  //     receiverId : id 
  //   }
  //   try {
  //     const response = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/chat/singlechat` , dataToSend ,{
  //       headers : {
  //         "Content-Type": "application/json",
  //       }
  //     } 
  //     )
  
  //   } catch (error) {
  //     console.log("Something went wrong while adding chat" , error); 
  //   }
  // }


  const filteredPeople = people.filter((person) => person.username.toLowerCase().includes(searchQuery.toLowerCase()));
  

  return (
    <Sheet>
      <SheetTrigger asChild>
      <Search className="text-gray-300 h-6 w-6 hover:text-gray-500 hover:cursor-pointer" />
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>People</SheetTitle>
          <SheetDescription>Search and add people to your network.</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <Input
            type="search"
            placeholder="Search people..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
           <div className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center items-center h-32">
                <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
              </div>
            ) : (
              filteredPeople.map((person , index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      {/* <AvatarImage src={person.avatar} alt={person.name} /> */}
                      <AvatarFallback>{person.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{person.username}</span>
                  </div>
                  <SheetClose asChild>
                    <Button size="icon" variant="ghost"
                    onClick={() =>handleAddChatFriend(person.id , person.username)}>
                      <Plus className="h-4 w-4" />
                      <span className="sr-only">Add {person.username}</span>
                    </Button>
                  </SheetClose>
                </div>
              ))
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

