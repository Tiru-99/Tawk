import { Request , Response } from "express";
import prisma from "../utils/prisma";


export const getMessagesByChatId = async(req : Request , res : Response) => {
    const { id } = req.params ; 
    const { incomingUserId } = req.params ; 
    console.log("incoming user id" , incomingUserId);
    console.log("This is my id" , id);

    const chatModel = await prisma.chatModel.findUnique({
        where : {
            id : id 
        }
    });

    if(!chatModel){
        res.json({
            message : "Chat with this id does not exists" 
        });
        return ; 
    }

   try {
    const messages = await prisma.message.findMany({
        where: {
          chatId: id, // Filter messages by the provided chatId
        },
        orderBy: {
          createdAt: "asc", // Optional: Order messages by creation time (ascending)
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              profile_pic: true, // Include additional user details if needed
            },
          },
        },
      });

    //through the users relation in the chat model we can query the user model 
    const chat = await prisma.chatModel.findFirst({
      where: {
        id: id,
      },
      select: { 
        id: true,
        name: true,
        isGroup: true,
        createdAt: true,
        users: { 
          include: {
            user: {
              select: {
                id: true,
                username: true,
                profile_pic: true,
                email: true,
              }
            }
          }
        }
      }
    });
    

    console.log("The chat details are " , chat);


    if(chat?.isGroup === false || chat?.name === null){
      //if the chat does not have a name 
      const filteredChat = chat.users.filter((user)=>user.userId !== incomingUserId);
      console.log("Filtered Chat is " , filteredChat);
      const chatName = filteredChat[0]?.user.username ; 
      const newChat = {...chat , name : chatName}

      console.log("This is my new chat" , newChat);
      
      res.status(200).json({
        message : "Successfully fetched the chat messages" , 
        data : messages , 
        chatDetails : newChat 
      });
      return ; 
    }

    // if the chat has a name send this response 
     res.status(200).json({
        message : "Successfully fetched the chat messages" , 
        data : messages,
        chatDetails : chat 
     })
   } catch (error) {
        res.status(500).json({
            message : "Something went wrong while fetching the messages", 
            error : error
        });
   }
}


