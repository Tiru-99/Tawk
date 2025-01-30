import { Request , Response } from "express";
import prisma from "../utils/prisma";


export const createChat = async (req: Request, res: Response) => {
    const { senderId, receiverId, name } = req.body;
  
    if (!senderId || !receiverId) {
      res.status(400).json({
        message: "Did not receive both senderId and receiverId",
      });
      return; 
    }
  
    try {
      // Step 1: Check if a chat already exists between the two users
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
           res.status(200).json({
            message: "Chat already exists",
            chatId: existingChat.id,
          });

          return ;
        }
      }
  
      // Step 2: Create a new chat if not found
      const newChat = await prisma.chatModel.create({
        data: {
          name: name || null,
          isGroup: false,
        },
      });
  
      // Step 3: Add both users to the chat in the ChatModelUsers table
      await prisma.chatModelUsers.createMany({
        data: [
          { userId: senderId, chatId: newChat.id },
          { userId: receiverId, chatId: newChat.id },
        ],
      });
  
      res.status(201).json({
        message: "Chat created successfully",
        chatId: newChat.id,
      });
    } catch (error) {
      console.error("Error creating chat:", error);
      res.status(500).json({
        message: "Something went wrong while creating the chat",
        error: error,
      });
    }
  };


export const createGroupChat = async (req: Request, res: Response) => {
  const { userIds, name } = req.body;

  if (!Array.isArray(userIds) || userIds.length === 0) {
    res.status(400).json({ message: "Invalid user id format or user id is empty" });
    return ;
  }

  try {
    // Step 1: Create a new chat
    const newChat = await prisma.chatModel.create({
      data: {
        name: name || null,
        isGroup: true,
      },
    });

    // Step 2: Insert users into the join table (ChatModelUsers)
    await prisma.chatModelUsers.createMany({
      data: userIds.map((userId: string) => ({
        userId,
        chatId: newChat.id,
      })),
    });

    res.status(201).json({
      message: "Group chat created successfully",
      chatId: newChat.id,
    });
  } catch (error) {
    console.error("Error creating group chat:", error);
    res.status(500).json({
      message: "Something went wrong while creating a group chat",
      error: error,
    });
  }
};

export const getChats = async(req:Request , res:Response) => {
    try{
        const chats = await prisma.chatModel.findMany();
        res.status(200).json({
            message : "chats fetched successfully", 
            data : chats
        });
    }catch(error){
        console.log("This is my error" , error);
        res.status(500).json({
            message : "Internal Server Error"
        });
    }
}