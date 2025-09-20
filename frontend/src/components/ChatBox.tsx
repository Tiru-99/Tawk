import Image from "next/image"
import { Video } from "lucide-react"
import { Input } from "./ui/input"
import { Smile } from "lucide-react"
export const ChatBox = () => {
    return (
        <>
            <div className="h-full border border-gray-300 rounded-md relative">
                <div className="flex justify-between p-3 border-b border-gray-300">
                    <div className="flex gap-3 items-center">
                        <div className="h-12 w-12 relative rounded-full">
                            <Image
                                src="/man.jpg"
                                alt="image"
                                fill
                                className="object-cover rounded-full ">
                            </Image>
                        </div>
                        <div className="flex flex-col">
                            <p className="text-lg font-semibold">Tiru</p>
                        </div>
                    </div>

                    <div className="flex items-center">
                        <span className="mr-4 cursor-pointer hover:bg-gray-300/30 p-3 rounded-full"><Video/></span>
                    </div>
                </div>

                {/* ChatBox Component */}
                <div className="absolute bottom-1 inset-x-0 border-t border-gray-300">
                    <div className="flex p-4">
                        <div className="relative">
                            <Input className ="w-full pr-10 focus:outline-none focus:ring-0 focus-visible:ring-0 border shadow-none border-gray-300 rounded-full p-5"></Input>
                            <Smile className="h-5 w-5 aboslute bottom-2 left-2"></Smile>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}