"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import axios from "axios"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Menu, X, Settings, LogOut } from "lucide-react";


export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="bg-white shadow-md w-full z-50">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0 flex items-center">
              <span className="text-xl font-bold text-gray-800">ChatMarshal</span>
            </Link>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            <NavbarRightContent />
          </div>
          <div className="-mr-2 flex items-center sm:hidden">
            <Button
              variant="ghost"
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
              onClick={() => setIsOpen(!isOpen)}
            >
              <span className="sr-only">Open main menu</span>
              {isOpen ? (
                <X className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="block h-6 w-6" aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1">
            <NavbarRightContent mobile />
          </div>
        </div>
      )}
    </nav>
  )
}

function NavbarRightContent({ mobile = false }: { mobile?: boolean }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageUrl , setImageUrl] = useState<string>("");
  const [fetchAgain , setFetchAgain] = useState<number>(0);
  const [open ,setOpen] = useState<boolean>(false);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
  
    console.log("Selected file:", file);
  
    try {
      const userId = localStorage.getItem("userId");
      if (!userId) {
        console.error("User ID not found in localStorage");
        return;
      }
  
      const fileType = encodeURIComponent(file.type);
      
      // Step 1: Get upload URL from backend
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/upload/upload-profile-pic/${userId}?fileType=${fileType}`
      );
  
      const uploadUrl = res.data.url;
      if (!uploadUrl) {
        console.error("Failed to get upload URL");
        return;
      }
  
      // Step 2: Upload the file using PUT request
      await axios.put(uploadUrl, file, {
        headers: {
          "Content-Type": file.type, 
        },
      });
      
      
      setFetchAgain((prev)=> prev + 1) ;
      console.log("File uploaded successfully");
  
    } catch (error) {
      console.error("Error during image upload process:", error);
    }
  };
  

  useEffect(()=>{
    const userId = localStorage.userId ; 
    axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/upload/get-profile-pic/${userId}`)
    .then((res)=>{
      setImageUrl(res.data.url);
      //react updates state asynchronously
      localStorage.setItem("profile_pic" , res.data.url);
    })
    .catch((error)=>{
      console.log("Something went wrong while fetching the image" , error);
    })
  },[fetchAgain]);


  return (
    <div className={mobile ? "space-y-2" : "flex items-center space-x-4"}>
      <Button variant="ghost" size={mobile ? "sm" : "default"} className="flex items-center">
        <Settings className="h-5 w-5 mr-2" />
        Settings
      </Button>
      <Button variant="ghost" size={mobile ? "sm" : "default"} className="flex items-center">
        <LogOut className="h-5 w-5 mr-2" />
        Logout
      </Button>
      <DropdownMenu open ={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarImage src={localStorage.profile_pic} alt="@username" />
              <AvatarFallback>UN</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">username</p>
              <p className="text-xs leading-none text-muted-foreground">user@example.com</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
            <button onClick={() => fileInputRef.current?.click()}>Change the Profile Pic</button>
          </DropdownMenuItem>
          {/* Hidden input because file uploading was not working in the shadcn dropdown menu item*/}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
          <DropdownMenuItem>Settings</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Log out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

