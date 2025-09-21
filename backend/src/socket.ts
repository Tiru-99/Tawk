import { Server } from "socket.io";
import { v4 as uuid } from "uuid"; 
import { Socket } from "socket.io";
import { ChatSocketType } from "./utils/enums";
import { produceMessage } from "./config/kafka";


export const SocketIoServer = ( io : Server)  => {
    io.on("connection" , ( socket : Socket ) => {
        socket.on(ChatSocketType.JOIN_CHAT , ( chatId : string ) => {
            socket.join(chatId); 
            console.log("Someone joined the room");
        });

        socket.on(ChatSocketType.SEND_MESSAGE , ( messageData  : any) => {
            const { chatId } = messageData ; 
            console.log("Coming in send message backend"); 
            //produce in the kafka queue
            produceMessage(JSON.stringify(messageData)); 
            io.to(chatId).emit("new-message", messageData);
        })
    })
}