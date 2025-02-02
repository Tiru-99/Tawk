import { Server } from "socket.io";
import prisma from "./utils/prisma";

interface SingleChatProps {
    senderId : string , 
    receiverId : string 
}

export const setupSocketIOServer = (io : Server) => {
    io.on("connection" , (socket) =>{

        //joining a chat
        socket.on("join-chat" , (chatId : string)=> {
            socket.join(chatId);
            console.log("Chat joined successfully");
        });

        socket.on('get-chats' , async(userId : string) => {
            try{
                const chats = await prisma.chatModel.findMany({
                  where:{
                    users : {
                     some : {
                      userId : userId  
                     }
                    }
                  } , 
                  include: {
                    users: {
                      include: {
                        user: { select: { username: true , id : true } } // Include the username from the User model @@ join operation
                      }
                    },
                  } 
                })
        
                console.log("chats" , chats);
                const simplifiedChats = chats.map((chat)=>({
                   id : chat.id ,
                   name : chat.name , 
                   isGroup : chat.isGroup , 
                   latestMessage : chat.latestMessage , 
                  
                   createdAt : chat.createdAt , 
                   users : chat.users.map((user)=> (
                    {
                      userId : user.user.id , 
                      username : user.user.username
                    }
                   ))
        
                }))
        
        
               io.emit("get-all-chats" , simplifiedChats);
            }catch(error){
                console.log("This is my error" , error);
                socket.emit("Something went wrong while fetching chats" , error);
                
            }
        } )

        socket.on("send-message" , async(data) => {
            const { content , senderId , chatId} = data; 

            //check if the data is receiveed
            if(!content || !senderId || !chatId){
                return socket.emit('error' , {message : "Invalid Data in the socket"})
            }

            try {
                //save the message
                const message = await prisma.message.create({
                    data : {
                        content , 
                        senderId, 
                        chatId
                    } , 
                    include :{
                        user : true 
                    }
                });

                //update the latest message
                await prisma.chatModel.update({
                    where : {
                        id : chatId
                    } , 
                    data : {
                        latestMessage : content 
                    }
                })
                //Broadcast the message to the group 
                io.to(chatId).emit("new-message" , message)
            } catch (error) {
                console.log("Error saving message" , error);
                socket.emit('error' , {message : "Failed to send message"})
            }
        })

        socket.on("disconnect" , ()=> {
            console.log(`User disconnected : ${socket.id}`)
        });
    })

    return io ; 
}   