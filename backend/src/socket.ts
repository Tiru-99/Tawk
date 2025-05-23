import { Server } from "socket.io";
import prisma from "./utils/prisma";
import { v4 as uuidv4 } from 'uuid';
import { pubClient , subClient } from "./config/redis";
import { produceMessage } from "./config/kafka";

interface SingleChatProps {
    senderId : string , 
    receiverId : string 
}

const subscribedChats = new Set<string>(); // to avoid duplicate subscriptions

export const setupSocketIOServer = (io : Server) => {
    io.on("connection" , (socket) =>{

        //joining a chat
        socket.on("join-chat" , (chatId : string)=> {
            socket.join(chatId);
            console.log("Chat joined successfully");

            //subscribe only once per chat id 
            if(!subscribedChats.has(chatId)){
              subClient.subscribe(chatId , (message : string) => {
                const parsed = JSON.parse(message);
                io.to(chatId).emit("new-message" , parsed)
              })
              subscribedChats.add(chatId);
              console.log("Subscribed to the redis channel" + chatId);
            }
        });

        //socket controller to create a single chat 

        socket.on("create-single-chat" , async(chatCreateData) => {
            const{senderId , receiverId , senderUsername , receiverUsername } = chatCreateData ; 
            console.log("Sender Username : " , senderUsername);
            console.log("Receiver Username :" , receiverUsername);

            const existingChat = await prisma.chatModel.findFirst({
                where: {
                  isGroup: false,
                  users: {
                    some: {
                      userId: senderId,
                    },
                  },
                },
                include: {
                  users: true,
                },
              });
          
              if (existingChat) {
                const isChatWithReceiver = existingChat.users.some(
                  (user) => user.userId === receiverId
                );
          
                if (isChatWithReceiver) {
                   socket.emit("Chat with this id already exists");
                   return ;
                }
              }

              const newChat = await prisma.chatModel.create({
                data: {
                  name : null ,
                  isGroup: false 
                },
                
              });
              

             const chatusers = await prisma.chatModelUsers.createMany({
                data : [
                    { userId: senderId, chatId: newChat.id },
                    { userId: receiverId, chatId: newChat.id },
                ]
            });

            console.log("These are my new chat users" , chatusers);

            const simplifiedChat = {
                id: newChat.id,
                name: newChat.name,
                isGroup: newChat.isGroup,
                latestMessage: newChat.latestMessage,
                createdAt: newChat.createdAt,
                users: [
                  { userId: senderId, chatId: newChat.id , username : senderUsername},
                  { userId: receiverId, chatId: newChat.id , username : receiverUsername },
                ]
              };

              console.log("user added successfully" , simplifiedChat);
              //message to emit that the new chat has been added 
              io.emit("new-chat-added", simplifiedChat);
        })

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
                        user: { select: { username: true , id : true , profile_pic : true} } // Include the username from the User model @@ join operation
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
                      username : user.user.username ,
                      profile_pic : user.user.profile_pic
                      
                    }
                   ))
        
                }))
        
        
               socket.emit("get-all-chats" , simplifiedChats);
            }catch(error){
                console.log("This is my error" , error);
                socket.emit("Something went wrong while fetching chats" , error);
                
            }
        } )

        socket.on("send-message", async (data) => {
          const { content, senderId, chatId , imageUrl} = data;
          // 1. Basic validation
          if ((!content || !senderId || !chatId) && !imageUrl) {
            return socket.emit("error", { message: "Invalid data" });
          }
        
          try {
            // 2. Fetch sender details
            const senderDetails = await prisma.user.findUnique({
              where: { id: senderId },
              select: { id: true, username: true, profile_pic: true }, // only required fields
            });
        
            if (!senderDetails) {
              return socket.emit("error", { message: "Sender not found" });
            }
        
            // 3. Construct enriched message
            const enrichedMessage = {
              id : uuidv4(),
              content,
              chatId,
              imageUrl,
              // timestamp: new Date().toISOString(),
              senderId: senderDetails.id,
              user: {
                userId: senderDetails.id,
                username: senderDetails.username,
                profile_pic: senderDetails.profile_pic,
              },
            };

            console.log("the enriched message" , enrichedMessage);

            //Publishing to redis 
            pubClient.publish(chatId , JSON.stringify(enrichedMessage));

            //send message to kafka consumer 
            await produceMessage(JSON.stringify(enrichedMessage));
            console.log("Message published to Redis" + chatId);
        
            // io.to(chatId).emit("new-message", enrichedMessage);
          } catch (err) {
            console.error("Error in send-message:", err);
            socket.emit("error", { message: "Internal server error" });
          }
        });

        socket.on("video-call-message" , async (data) => {
          const {senderId , content , chatId , type} = data; 

          if(!senderId || !content || !chatId || !type){
            console.log("Missing data in video call" , senderId , content , chatId , type );
            return socket.emit("error", { message: "Incomplete data in video call" });
          }

         try {
           const senderDetails = await prisma.user.findUnique({
             where: { id: senderId },
             select: { id: true, username: true, profile_pic: true }, // only required fields
           });
 
           if (!senderDetails) {
             return socket.emit("error", { message: "Sender not found" });
           }

           const enrichedMessage = {
            id : uuidv4(),
            content,
            chatId,
            // timestamp: new Date().toISOString(),
            type , 
            senderId: senderDetails.id,
            user: {
              userId: senderDetails.id,
              username: senderDetails.username,
              profile_pic: senderDetails.profile_pic,
            },
          };

          console.log("the enriched message" , enrichedMessage);

          //Publishing to redis 
          pubClient.publish(chatId , JSON.stringify(enrichedMessage));

          //send message to kafka consumer 
          await produceMessage(JSON.stringify(enrichedMessage));
          console.log("Message published to Redis" + chatId);
         } catch (error) {
            console.error("Error in send-message video call:", error);
            socket.emit("error", { message: "Internal server error" });
         }
      
        })
        

        socket.on("disconnect" , ()=> {
            console.log(`User disconnected : ${socket.id}`)
        });
    })

    return io ; 
}   