"use client"
import { useState ,  useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRef } from "react"
import { useLogout } from "@/hooks/useAuth"
import axios from "axios"

export const Navbar = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [imageUrl , setImageUrl] = useState();
  const [ fetchAgain , setFetchAgain] = useState<number>(0);
  const [ fallbackName , setFallbackName ] = useState<string>();
  const { doLogout , isLoading } = useLogout(); 


  useEffect(() => {
    const userId = localStorage.userId;
    axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/upload/get-profile-pic/${userId}`)
      .then((res) => {
        console.log("the image url is " , res.data.url);
        setImageUrl(res.data.url);
        //react updates state asynchronously
        localStorage.setItem("imageUrl", res.data.url);
      })
      .catch((error) => {
        console.log("Something went wrong while fetching the image", error);
      })
  }, [fetchAgain]);

  useEffect(() => {
    const name = localStorage.getItem("name"); 
    if(!name){
      return 
    }
    setFallbackName(name); 
  })


  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
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
  return (
    <>
      <div className="flex justify-between px-6 py-3 border-t border-gray-300">
        <Button className="bg-white text-red-500 border-1 border-red-400 hover:bg-red-300/10 cursor-pointer"
        onClick={doLogout}>{isLoading ? "Logging out..." : "Logout"}</Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarImage src={imageUrl} alt="User profile photo" />
                <AvatarFallback aria-label="User initials" className="bg-gray-100">{fallbackName?.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="sr-only">Open user menu</span>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-48 border border-gray-200 bg-white m-2">
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                fileInputRef.current?.click()
              }}
              className="hover:bg-gray-50"
            >
              Change photo
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </>
  )
}