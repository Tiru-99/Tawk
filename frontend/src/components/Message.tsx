"use client"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { Dot } from "lucide-react"
import { Video, Phone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export const Message = ({ message }: any) => {
  // Safe localStorage access (only in browser)
  const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
  const isOwn = userId === message?.authorId;
  
  const formatted = new Date(message?.createdAt).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });


  return (
    <>
      <div className={`mt-3 flex ${isOwn ? "justify-end" : "justify-start"}`}>
        <div className="flex gap-3">
          {!isOwn && (
            <div className="">
              <Avatar>
                <AvatarImage className="h-10 w-10" src={message?.author?.imageUrl}></AvatarImage>
                <AvatarFallback className="bg-gray-100 text-sm">{message?.author.name.slice(0,2).toUpperCase()}</AvatarFallback>
              </Avatar>
            </div>
          )}
          <div className="flex flex-col">
            <div className={`flex items-center ${isOwn ? "justify-end" : "justify-start"}`}>
              <p className="text-gray-900">{isOwn ? "You" : message?.author?.name}</p>
              <span className="flex justify-center items-center rounded-full">
                <Dot className="text-neutral-500" />
              </span>
              <p className="text-gray-500 text-sm">{formatted}</p>
            </div>


            {/* Message Container */}
            {message?.type === "TEXT" && (
              <TextMessage isOwn={isOwn} content={message.content} />
            )}

            {message?.type === "MEDIA" && (
              <MediaMessage isOwn={isOwn} message={message} />
            )}

            {message?.type === "CALL" && (
              <VideoCallMessage isOwn={isOwn} url={message.callUrl}></VideoCallMessage>
            )}

          </div>
        </div>
      </div>
    </>
  )
}

const TextMessage = ({ isOwn, content }: { isOwn: boolean, content: string }) => {
  return (
    <>
      <div className={`p-3 rounded-lg mt-2 ${isOwn ? "bg-blue-500 text-white" : "border-neutral-200 bg-gray-50/30 border"}`}>
        <p>{content}</p>
      </div>
    </>
  )
}

interface MediaMessageProps {
  message: any,
  isOwn: boolean
}

const MediaMessage = ({ isOwn, message }: MediaMessageProps) => {
  return (
    <>
      <div className={`mt-2 ${isOwn ? "self-end" : "self-start"}`}>
        <img src={message?.mediaUrl || "/man.jpg"} alt="media" className="rounded-lg max-w-xs" />
      </div>
    </>
  )
}


const VideoCallMessage = ({ isOwn, url }: { isOwn: boolean, url: string }) => {
  return (
    <>
      {/* Dialog Trigger */}
      <Dialog>
        <DialogTrigger asChild>
          <div
            className={`flex items-center px-4 py-2 mt-2 rounded-lg text-sm cursor-pointer ${isOwn
              ? "bg-blue-100 text-blue-700 self-end"
              : "bg-green-100 text-green-700 self-start"
              }`}
          >
            <Video className="w-5 h-5 mr-2" />
            <div>
              <div className="font-semibold">{isOwn ? "You" : ""}</div>
              <div className="text-xs italic">Video call</div>
            </div>
          </div>
        </DialogTrigger>

        {/* Dialog Popup */}
        <DialogContent className="sm:max-w-sm bg-white">
          <DialogHeader>
            <DialogTitle>Video Call</DialogTitle>
            <DialogDescription>Join video call?</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-around mt-4">
            <Button variant="default" className="flex items-center gap-2 bg-green-500 hover:bg-green-600"
              onClick={() => window.open(`/call/${url}`, "_blank")}>
              <Phone className="w-4 h-4" />
              Join
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};