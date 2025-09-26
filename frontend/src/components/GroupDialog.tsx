"use client"
import { useState } from "react"
import { Check, Loader2, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useGetUsersForGroupChat } from "@/hooks/userHooks";
import { useCreateGroupChat } from "@/hooks/chatHooks"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { on } from "events"


type GroupDialogProps =  { 
  onAddChat : () => void
}

export function GroupDialog({ onAddChat } : GroupDialogProps) {

  const { users, getUsers, isLoading } = useGetUsersForGroupChat();
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const { createGroupChat, isSubmitting } = useCreateGroupChat();
  const [groupName, setGroupName] = useState<string>();
  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    )
  }


  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); 
    console.log("Submitted");
    const userId = localStorage.getItem("userId");

    if (!userId) {
      return;
    }

    if (groupName == null || !groupName) {
      toast.error("Group name cannot be empty");
      return
    }
    // call the api to create the group chat 
    const finalUserIds = [...selectedUsers , userId]; 

    const dataToSend = {
      userIds: finalUserIds,
      name: groupName,
      adminId: userId
    }

    createGroupChat(dataToSend).then(() => {
      onAddChat(); 
    })

  }


  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" onClick={getUsers} className="border border-gray-300 text-gray-400 cursor-pointer">
          <Users className="h-5 w-5" />
          <span className="sr-only">Create group chat</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px] bg-white border border-gray-300 ">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Group Chat</DialogTitle>
            <DialogDescription>
              Create a new group chat by adding a name and selecting members.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Group Name */}
            <div className="grid gap-2">
              <Label htmlFor="name">Group Name</Label>
              <Input
                onChange={(e) => setGroupName(e.target.value)}
                id="name"
                placeholder="Enter group name"
                className="col-span-3"
              />
            </div>

            {/* User List */}

            <div className="grid gap-2">
              <Label>Select Members</Label>
              <ScrollArea className="h-[200px] rounded-md border p-2">
                {isLoading ? (
                  <div className="flex justify-center items-center h-[180px]">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {users?.map((user: any) => (
                      <div
                        key={user.id}
                        onClick={() => toggleUserSelection(user.id)}
                        className={cn(
                          "flex items-center space-x-3 rounded-md p-2 cursor-pointer hover:bg-gray-200/20",
                          selectedUsers.includes(user.id) && "bg-gray-200/20"
                        )}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar} alt={user.name} />
                          <AvatarFallback className="bg-gray-200 flex justify-center items-center">
                            {user.name?.charAt(0).toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium leading-none">
                            {user.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                        {selectedUsers.includes(user.id) && (
                          <Check className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    ))}
                  </div>
                )
                }

              </ScrollArea>
            </div>
          </div>

          {/* Submit */}
          <DialogFooter>
            <Button disabled={isLoading && isSubmitting} className="cursor-pointer">
              {isLoading && isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Group
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
