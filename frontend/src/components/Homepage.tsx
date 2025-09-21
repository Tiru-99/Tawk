import { useLogout } from "@/hooks/useAuth";
import { ChatSidebar } from "./ChatSidebar";
import { ChatBox } from "./ChatBox";
import { ChatProvider } from "@/context/chatContext";

export default function HomePage() {
    const { isLoading, doLogout } = useLogout();
    return (
        <>
            <div>
                Hi this is the homepage bro , 
                <button
                onClick={doLogout}>{isLoading ? "logging out" : "log out"}</button>
            </div>

            {/* Desktop Container */}
            <ChatProvider>
                <div className="h-screen flex gap-6 px-6 py-4 overflow-y-hidden">
                    <div className="w-1/4">
                        <ChatSidebar></ChatSidebar>
                    </div>

                    <div className="w-3/4">
                        {/* Chat Section */}
                        <ChatBox />
                    </div>
                </div>
            </ChatProvider>
        </>
    )
}