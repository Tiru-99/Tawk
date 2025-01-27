import { Request , Response } from "express";
import prisma from "../utils/prisma";


export const createChat = async(req : Request , res : Response) => {
    //incoming request will have user id and whom the user wants to chat with 
    // create a room between those two users and start chatting 
    // save the room into chat model and also save the chats in the message models
    const { senderId , receiverId , name } = req.body ; 

    if(!senderId || !receiverId){
        res.json({
            message : "Did not receive the senderId and the receiverId"
        })
    }

     try {
        await prisma.chatModel.create({
           data : {
               name : name || null, 
               isGroup : false, 
               users : {
                   connect : [ 
                       { id : senderId }, 
                       { id : receiverId }
                   ]
               }
           }
       });

       res.status(200).json({
        message: "Chat created Successfully"
       })
     } catch (error) {
        console.log("There is something wrong while creating a room");
        res.json({
            message : "Something went wrong while initiating the room", 
            error : error
        })
     }

}

export const createGroupChat = async(req : Request , res:Response) => {
    //passing all the user id in array from the frontend 
    //creating a group of users in the chat
   const { userIds , name} = req.body;

   if(!Array.isArray(userIds) || userIds.length === 0){
    res.json({
        message : "Invalid user id format or user id is empty"
    })
    return ; 
   }

   try {
    await prisma.chatModel.create({
       data:{
         name : name || null , 
         isGroup : true , 
         users : {
             connect  : userIds.map((id) => ({id}))
         }
       }
    });

    res.status(200).json({
        message : "Group chat created successfully"
    })
   } catch (error) {
     console.log("Error creating group chat");
     res.status(500).json({
        message : "Something went wrong while creating a group chat", 
        error : error
     });
   }
}