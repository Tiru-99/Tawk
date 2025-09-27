
import { ChatSidebar } from "./ChatSidebar";
import { ChatBox } from "./ChatBox";
import { useChat } from "@/context/chatContext";

export default function HomePage() {
    const { selectedChat, setSelectedChat } = useChat();
    return (
        <>
        
            {/* Desktop Container */}

            <div className="hidden lg:block">
                <div className="h-screen flex gap-6 px-6 py-4 overflow-y-hidden">
                    <div className="w-1/4">
                        <ChatSidebar></ChatSidebar>
                    </div>

                    <div className="w-3/4">
                        
                        {/* Chat Section */}
                        <ChatBox />
                    </div>
                </div>
            </div>

            <div className="block lg:hidden">
                {selectedChat ? (
                    <div className="w-screen h-screen p-3">
                        <button
                            onClick={() => setSelectedChat(null)}
                            className="px-3 py-1 rounded-md bg-gray-100 hover:bg-gray-200">
                            back
                        </button>
                        <ChatBox />
                    </div>
                ) : (
                    <div className="w-screen h-screen p-3">
                        <ChatSidebar />
                    </div>
                )}
            </div>

        </>
    )
}