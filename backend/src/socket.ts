import { Server } from "socket.io";
import prisma from "./utils/prisma";

export const setupSocketIOServer = (io : Server) => {
    io.on("connection" , (socket) =>{

        //joining a chat
        socket.on("join-chat" , (chatId : string)=> {
            socket.join(chatId);
            console.log("Chat joined successfully");
        });

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