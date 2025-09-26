import { Sheet, SheetContent, SheetTitle, SheetTrigger, SheetClose } from "./ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { UserPlus, Plus } from "lucide-react";
import { useUsers, useCreateChat } from "@/hooks/userHooks";
import { Loader2 } from "lucide-react";

type UserSheetProps = {
    onAddChat: () => void
}
export const UserSheet = ({ onAddChat }: UserSheetProps) => {

    const { users, isLoading, fetchUsers } = useUsers();
    const { isLoading: createChatLoading, createChat } = useCreateChat();

    const handleCreateChat = (name: string, imageUrl: string, id: string, email: string) => {
        const data = {
            name,
            imageUrl,
            id,
            email
        }

        createChat(data).then(() => {
            //refetch on creating
            fetchUsers();
            onAddChat();
        });
    }

    //todo add loaders here bro
    return (
        <>
            <Sheet>
                <SheetTrigger asChild>
                    <UserPlus className="text-gray-400 cursor-pointer"
                        onClick={() => fetchUsers()}></UserPlus>
                </SheetTrigger>
                <SheetContent className="bg-white p-4">
                    {createChatLoading || isLoading ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-50">
                            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                        </div>
                    ) : null}
                    <SheetTitle>
                        Add a friend
                    </SheetTitle>

                    <div className="mt-6 space-y-4">
                        <Input
                            type="search"
                            placeholder="Search people..."
                            className="w-full"
                        />

                        <div className="space-y-4">
                            {users && users.length === 0 ? (
                                <p className="text-center text-gray-500">No current users found</p>
                            ) : (
                                users.map((user, index) => (
                                    <div key={index} className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <Avatar className="h-11 w-11">
                                                <AvatarImage src={user.imageUrl} alt="@shadcn" />
                                                <AvatarFallback>
                                                    {user.name.slice(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>

                                            <span className="font-medium">{user.name}</span>
                                        </div>

                                        <SheetClose asChild>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="cursor-pointer"
                                                onClick={() =>
                                                    handleCreateChat(user.name, user.imageUrl, user.id, user.email)
                                                }
                                            >
                                                <Plus className="h-4 w-4" />
                                                <span className="sr-only">Add {user.name}</span>
                                            </Button>
                                        </SheetClose>
                                    </div>
                                ))
                            )}
                        </div>

                    </div>
                </SheetContent>
            </Sheet>
        </>
    )
}