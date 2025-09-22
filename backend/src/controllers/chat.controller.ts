import { Request, Response } from "express";
import prisma from "../utils/prisma";

export const createChat = async (req: Request, res: Response) => {
  const { senderId, receiverId, name } = req.body;

  if (!senderId || !receiverId) {
    return res.status(400).json({
      message: "Did not receive both senderId and receiverId",
    });
  }

  try {
    // Step 1: Check if a chat already exists between the two users
    const existingChat = await prisma.chat.findFirst({
      where: {
        isGroupChat: false,
        participants: {
          some: {
            userId: senderId,
          },
        },
      },
      include: {
        participants: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (existingChat) {
      const isChatWithReceiver = existingChat.participants.some(
        (participant) => participant.userId === receiverId
      );

      if (isChatWithReceiver) {
        return res.status(200).json({
          message: "Chat already exists",
          chatId: existingChat.id,
        });
      }
    }

    // Step 2: Create a new chat if not found
    const newChat = await prisma.chat.create({
      data: {
        name: name || null,
        isGroupChat: false,
        latestMessage: "",
        participants: {
          create: [
            {
              userId: senderId,
              lastSeenAt: new Date(),
            },
            {
              userId: receiverId,
              lastSeenAt: new Date(),
            },
          ],
        },
      },
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
  const { userIds, name, adminId } = req.body;

  if (!Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ 
      message: "Invalid user id format or user id is empty" 
    });
  }

  if (!name) {
    return res.status(400).json({ 
      message: "Group chat name is required" 
    });
  }

  try {
    // Step 1: Create a new group chat
    const newChat = await prisma.chat.create({
      data: {
        name,
        isGroupChat: true,
        adminId: adminId || userIds[0], 
        latestMessage: "",
        participants: {
          create: userIds.map((userId: string) => ({
            userId,
            lastSeenAt: new Date(),
          })),
        },
      },
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

export const getChats = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const chats = await prisma.chat.findMany({
      where: {
        participants: {
          some: {
            userId: id,
          },
        },
      },
      include: {
        participants: {
          include: {
            user: { 
              select: { 
                name: true, 
                id: true, 
                imageUrl: true 
              } 
            },
          },
        },
        admin: {
          select: {
            id: true,
            name: true,
          },
        },
        messages : {
          select : {
            authorId : true , 
            author : {
              select :{
                name : true , 
                email : true
              }
            },
            chat : {
              select : {
                id : true
              }
            } ,
            content : true , 
            mediaUrl : true , 
            id : true , 
            type : true
          }
        }
      },
      orderBy: {
        latestMessageCreatedAt: 'desc',
      },
    });

    

    const simplifiedChats = chats.map((chat) => {
      // Get current user's participant data for unseen count
      const currentUserParticipant = chat.participants.find(
        (participant) => participant.userId === id
      );

      //for single 1v1 chat find the other participant's name
      let otherParticipant ;  
      if(chat.isGroupChat === false){
        otherParticipant = chat.participants.find((p) => p.user.id !== id )
      }
      return {
        id: chat.id,
        name: chat.name ?? otherParticipant?.user.name,
        isGroupChat: chat.isGroupChat,
        latestMessage: chat.latestMessage,
        latestMessageCreatedAt: chat.latestMessageCreatedAt,
        unseenCount: currentUserParticipant?.unseenCount || 0,
        chatMessages : chat.messages, 
        admin: chat.admin ? {
          id: chat.admin.id,
          name: chat.admin.name,
        } : null,
        otherImageUrl : otherParticipant?.user.imageUrl,
        participants: chat.participants.map((participant) => ({
          userId: participant.user.id,
          name: participant.user.name,
          imageUrl: participant.user.imageUrl,
          lastSeenAt: participant.lastSeenAt,
        })),
      };
    });

    res.status(200).json({
      message: "Chats fetched successfully",
      chats: simplifiedChats,
    });
  } catch (error) {
    console.log("This is my error", error);
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

// Additional utility function to update unseen count when user opens a chat
export const markChatAsSeen = async (req: Request, res: Response) => {
  const { chatId, userId } = req.body;

  if (!chatId || !userId) {
    return res.status(400).json({
      message: "Chat ID and User ID are required",
    });
  }

  try {
    await prisma.participant.updateMany({
      where: {
        chatId,
        userId,
      },
      data: {
        unseenCount: 0,
        lastSeenAt: new Date(),
      },
    });

    res.status(200).json({
      message: "Chat marked as seen",
    });
  } catch (error) {
    console.error("Error marking chat as seen:", error);
    res.status(500).json({
      message: "Something went wrong while updating chat status",
    });
  }
};