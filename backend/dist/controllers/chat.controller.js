"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getChats = exports.createGroupChat = exports.createChat = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const createChat = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { senderId, receiverId, name } = req.body;
    if (!senderId || !receiverId) {
        res.status(400).json({
            message: "Did not receive both senderId and receiverId",
        });
        return;
    }
    try {
        // Step 1: Check if a chat already exists between the two users
        const existingChat = yield prisma_1.default.chatModel.findFirst({
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
            const isChatWithReceiver = existingChat.users.some((user) => user.userId === receiverId);
            if (isChatWithReceiver) {
                res.status(200).json({
                    message: "Chat already exists",
                    chatId: existingChat.id,
                });
                return;
            }
        }
        // Step 2: Create a new chat if not found
        const newChat = yield prisma_1.default.chatModel.create({
            data: {
                name: name || null,
                isGroup: false,
            },
        });
        // Step 3: Add both users to the chat in the ChatModelUsers table
        yield prisma_1.default.chatModelUsers.createMany({
            data: [
                { userId: senderId, chatId: newChat.id },
                { userId: receiverId, chatId: newChat.id },
            ],
        });
        res.status(201).json({
            message: "Chat created successfully",
            chatId: newChat.id,
        });
    }
    catch (error) {
        console.error("Error creating chat:", error);
        res.status(500).json({
            message: "Something went wrong while creating the chat",
            error: error,
        });
    }
});
exports.createChat = createChat;
const createGroupChat = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userIds, name } = req.body;
    if (!Array.isArray(userIds) || userIds.length === 0) {
        res.status(400).json({ message: "Invalid user id format or user id is empty" });
        return;
    }
    try {
        // Step 1: Create a new chat
        const newChat = yield prisma_1.default.chatModel.create({
            data: {
                name: name || null,
                isGroup: true,
            },
        });
        // Step 2: Insert users into the join table (ChatModelUsers)
        yield prisma_1.default.chatModelUsers.createMany({
            data: userIds.map((userId) => ({
                userId,
                chatId: newChat.id,
            })),
        });
        res.status(201).json({
            message: "Group chat created successfully",
            chatId: newChat.id,
        });
    }
    catch (error) {
        console.error("Error creating group chat:", error);
        res.status(500).json({
            message: "Something went wrong while creating a group chat",
            error: error,
        });
    }
});
exports.createGroupChat = createGroupChat;
const getChats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    //query to find chats in which user with id , id exists 
    try {
        const chats = yield prisma_1.default.chatModel.findMany({
            where: {
                users: {
                    some: {
                        userId: id
                    }
                }
            },
            include: {
                users: {
                    include: {
                        user: { select: { username: true, id: true } } // Include the username from the User model @@ join operation
                    }
                },
            }
        });
        console.log("chats", chats);
        const simplifiedChats = chats.map((chat) => ({
            id: chat.id,
            name: chat.name,
            isGroup: chat.isGroup,
            latestMessage: chat.latestMessage,
            createdAt: chat.createdAt,
            users: chat.users.map((user) => ({
                userId: user.user.id,
                username: user.user.username
            }))
        }));
        res.status(200).json({
            message: "chats fetched successfully",
            data: simplifiedChats,
        });
    }
    catch (error) {
        console.log("This is my error", error);
        res.status(500).json({
            message: "Internal Server Error"
        });
    }
});
exports.getChats = getChats;
