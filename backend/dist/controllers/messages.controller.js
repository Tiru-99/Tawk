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
exports.saveMessage = exports.getMessagesByChatId = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const getMessagesByChatId = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { id } = req.params;
    const { incomingUserId } = req.params;
    console.log("incoming user id", incomingUserId);
    console.log("This is my id", id);
    const chatModel = yield prisma_1.default.chatModel.findUnique({
        where: {
            id: id
        }
    });
    if (!chatModel) {
        res.json({
            message: "Chat with this id does not exists"
        });
        return;
    }
    try {
        const messages = yield prisma_1.default.message.findMany({
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
        const chat = yield prisma_1.default.chatModel.findFirst({
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
        console.log("The chat details are ", chat);
        if ((chat === null || chat === void 0 ? void 0 : chat.isGroup) === false || (chat === null || chat === void 0 ? void 0 : chat.name) === null) {
            //if the chat does not have a name 
            const filteredChat = chat.users.filter((user) => user.userId !== incomingUserId);
            console.log("Filtered Chat is ", filteredChat);
            const chatName = (_a = filteredChat[0]) === null || _a === void 0 ? void 0 : _a.user.username;
            const newChat = Object.assign(Object.assign({}, chat), { name: chatName });
            console.log("This is my new chat", newChat);
            res.status(200).json({
                message: "Successfully fetched the chat messages",
                data: messages,
                chatDetails: newChat
            });
            return;
        }
        // if the chat has a name send this response 
        res.status(200).json({
            message: "Successfully fetched the chat messages",
            data: messages,
            chatDetails: chat
        });
    }
    catch (error) {
        res.status(500).json({
            message: "Something went wrong while fetching the messages",
            error: error
        });
    }
});
exports.getMessagesByChatId = getMessagesByChatId;
const saveMessage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { senderId, content, chatId, type, imageUrl } = req.body;
    if ((!senderId || !content || !chatId || !type) && !imageUrl) {
        console.log("Incomplete fucking details");
        return;
    }
    if (!["IMAGE", "TEXT"].includes(type)) {
        res.status(403).send({
            message: "Incorrect message type sent"
        });
        return;
    }
    try {
        yield prisma_1.default.message.create({
            data: {
                content: content,
                senderId,
                chatId,
                type: type,
                imageUrl: imageUrl
            }
        });
        console.log("message saved successfully");
        res.status(200).send({
            message: "Message saved successfully"
        });
    }
    catch (error) {
        console.log("Something went wrong whie saving the message", error);
        res.status(500).send({
            message: "Something went wrong while saving message",
            error: error
        });
    }
});
exports.saveMessage = saveMessage;
