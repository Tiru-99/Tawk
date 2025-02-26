import { Request , Response } from "express";
import prisma from "../utils/prisma";


export const getMessagesByChatId = async(req : Request , res : Response) => {
    const { id } = req.params ; 
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
 
    //  console.log("These are my room related messages " , messages);
     res.json({
        message : "Successfully fetched the chat messages" , 
        data : messages
     })
   } catch (error) {
        res.json({
            message : "Something went wrong while fetching the messages", 
            error : error
        });
   }
}


