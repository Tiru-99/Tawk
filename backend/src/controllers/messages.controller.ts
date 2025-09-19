
import { Request , Response } from "express";
import prisma from "../utils/prisma";

export const getMessagesByChatId = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { incomingUserId } = req.params;

  console.log("incoming user id", incomingUserId);
  console.log("This is my id", id);

  // Check if chat exists
  const chatExists = await prisma.chat.findUnique({
    where: {
      id: id
    }
  });

  if (!chatExists) {
    return res.status(404).json({
      message: "Chat with this id does not exist"
    });
  }

  try {
    // Fetch messages for the chat
    const messages = await prisma.messages.findMany({
      where: {
        chatId: id,
      },
      orderBy: {
        createdAt: "asc",
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
          },
        },
      },
    });

    // Fetch chat details with participants
    const chat = await prisma.chat.findFirst({
      where: {
        id: id,
      },
      select: {
        id: true,
        name: true,
        isGroupChat: true,
        adminId: true,
        latestMessage: true,
        latestMessageCreatedAt: true,
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
                email: true,
              }
            }
          }
        },
        admin: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    if (!chat) {
      return res.status(404).json({
        message: "Chat details not found"
      });
    }

    console.log("The chat details are", chat);

    // For individual chats (non-group chats), use the other participant's name as chat name
    if (chat.isGroupChat === false || chat.name === null) {
      const filteredParticipants = chat.participants.filter(
        (participant) => participant.userId !== incomingUserId
      );
      
      console.log("Filtered Participants are", filteredParticipants);
      
      const chatName = filteredParticipants[0]?.user.name || "Unknown User";
      const chatImageUrl = filteredParticipants[0]?.user.imageUrl || null;

      const newChat = {
        ...chat,
        name: chatName,
        imageUrl: chatImageUrl, // Add image for individual chats
        participants: chat.participants.map(participant => ({
          userId: participant.user.id,
          name: participant.user.name,
          imageUrl: participant.user.imageUrl,
          email: participant.user.email,
          lastSeenAt: participant.lastSeenAt,
          unseenCount: participant.unseenCount
        }))
      };

      console.log("This is my new chat", newChat);

      return res.status(200).json({
        message: "Successfully fetched the chat messages",
        data: messages,
        chatDetails: newChat
      });
    }

    // For group chats, return as is with proper participant mapping
    const groupChat = {
      ...chat,
      participants: chat.participants.map(participant => ({
        userId: participant.user.id,
        name: participant.user.name,
        imageUrl: participant.user.imageUrl,
        email: participant.user.email,
        lastSeenAt: participant.lastSeenAt,
        unseenCount: participant.unseenCount
      }))
    };

    res.status(200).json({
      message: "Successfully fetched the chat messages",
      data: messages,
      chatDetails: groupChat
    });

  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({
      message: "Something went wrong while fetching the messages",
      error: error
    });
  }
};