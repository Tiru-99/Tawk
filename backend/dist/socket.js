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
exports.setupSocketIOServer = void 0;
const prisma_1 = __importDefault(require("./utils/prisma"));
const uuid_1 = require("uuid");
const redis_1 = require("./config/redis");
const subscribedChats = new Set(); // to avoid duplicate subscriptions
const setupSocketIOServer = (io) => {
    io.on("connection", (socket) => {
        //joining a chat
        socket.on("join-chat", (chatId) => {
            socket.join(chatId);
            console.log("Chat joined successfully");
            //subscribe only once per chat id 
            if (!subscribedChats.has(chatId)) {
                redis_1.subClient.subscribe(chatId, (message) => {
                    const parsed = JSON.parse(message);
                    io.to(chatId).emit("new-message", parsed);
                });
                subscribedChats.add(chatId);
                console.log("Subscribed to the redis channel" + chatId);
            }
        });
        //socket controller to create a single chat 
        socket.on("create-single-chat", (chatCreateData) => __awaiter(void 0, void 0, void 0, function* () {
            const { senderId, receiverId, senderUsername, receiverUsername } = chatCreateData;
            console.log("Sender Username : ", senderUsername);
            console.log("Receiver Username :", receiverUsername);
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
                    socket.emit("Chat with this id already exists");
                    return;
                }
            }
            const newChat = yield prisma_1.default.chatModel.create({
                data: {
                    name: null,
                    isGroup: false
                },
            });
            const chatusers = yield prisma_1.default.chatModelUsers.createMany({
                data: [
                    { userId: senderId, chatId: newChat.id },
                    { userId: receiverId, chatId: newChat.id },
                ]
            });
            console.log("These are my new chat users", chatusers);
            const simplifiedChat = {
                id: newChat.id,
                name: newChat.name,
                isGroup: newChat.isGroup,
                latestMessage: newChat.latestMessage,
                createdAt: newChat.createdAt,
                users: [
                    { userId: senderId, chatId: newChat.id, username: senderUsername },
                    { userId: receiverId, chatId: newChat.id, username: receiverUsername },
                ]
            };
            console.log("user added successfully", simplifiedChat);
            //message to emit that the new chat has been added 
            io.emit("new-chat-added", simplifiedChat);
        }));
        socket.on('get-chats', (userId) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const chats = yield prisma_1.default.chatModel.findMany({
                    where: {
                        users: {
                            some: {
                                userId: userId
                            }
                        }
                    },
                    include: {
                        users: {
                            include: {
                                user: { select: { username: true, id: true, profile_pic: true } } // Include the username from the User model @@ join operation
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
                        username: user.user.username,
                        profile_pic: user.user.profile_pic
                    }))
                }));
                socket.emit("get-all-chats", simplifiedChats);
            }
            catch (error) {
                console.log("This is my error", error);
                socket.emit("Something went wrong while fetching chats", error);
            }
        }));
        socket.on("send-message", (data) => __awaiter(void 0, void 0, void 0, function* () {
            const { content, senderId, chatId, imageUrl } = data;
            console.log("The code is reaching here in the socket part");
            // 1. Basic validation
            if ((!content || !senderId || !chatId) && !imageUrl) {
                return socket.emit("error", { message: "Invalid data" });
            }
            try {
                // 2. Fetch sender details
                const senderDetails = yield prisma_1.default.user.findUnique({
                    where: { id: senderId },
                    select: { id: true, username: true, profile_pic: true }, // only required fields
                });
                if (!senderDetails) {
                    return socket.emit("error", { message: "Sender not found" });
                }
                // 3. Construct enriched message
                const enrichedMessage = {
                    id: (0, uuid_1.v4)(),
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
                console.log("the enriched message", enrichedMessage);
                //Publishing to redis 
                redis_1.pubClient.publish(chatId, JSON.stringify(enrichedMessage));
                console.log("Message published to Redis" + chatId);
                // io.to(chatId).emit("new-message", enrichedMessage);
            }
            catch (err) {
                console.error("Error in send-message:", err);
                socket.emit("error", { message: "Internal server error" });
            }
        }));
        socket.on("disconnect", () => {
            console.log(`User disconnected : ${socket.id}`);
        });
    });
    return io;
};
exports.setupSocketIOServer = setupSocketIOServer;
