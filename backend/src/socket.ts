import { Server } from "socket.io";
import { v4 as uuid } from "uuid";
import { Socket } from "socket.io";
import { ChatSocketType } from "./utils/enums";
import { produceMessage } from "./config/kafka";
import { pubClient , subClient } from "./config/redis";

const subscribedChats = new Set<string>(); // to avoid duplicate subscriptions

export const SocketIoServer = (io: Server) => {
    io.on("connection", (socket: Socket) => {
        socket.on(ChatSocketType.JOIN_CHAT, (id: string) => {
            //id is chatId here 
            socket.join(id);
            console.log("Someone joined the room");

            if(!subscribedChats.has(id)){
              subClient.subscribe(id , (message : string) => {
                const parsed = JSON.parse(message);
                io.to(id).emit("new-message" , parsed)
              })
              subscribedChats.add(id);
              console.log("Subscribed to the redis channel" + id);
            }
        });

        socket.on(ChatSocketType.SEND_MESSAGE, (messageData: any) => {
            const { chatId } = messageData;
            console.log("the chat id is", chatId);
            //produce in the kafka queue
            produceMessage(JSON.stringify(messageData));
            pubClient.publish(chatId , JSON.stringify(messageData));
        })
    })
}