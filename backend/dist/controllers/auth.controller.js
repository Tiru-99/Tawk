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
exports.health = exports.getUsers = exports.getAllUsers = exports.checkAuth = exports.loginHandler = exports.handleSignUp = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const handleSignUp = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password, username, profile_pic } = req.body;
    const userExists = yield prisma_1.default.user.findFirst({
        where: {
            OR: [
                { email: email },
                { username: username }
            ]
        }
    });
    if (userExists) {
        res.status(400).json({
            message: "User with this email Id and username already exists"
        });
    }
    const hashedPassword = yield bcrypt_1.default.hash(password, 10);
    try {
        const user = yield prisma_1.default.user.create({
            data: {
                email,
                password: hashedPassword,
                username,
                profile_pic: profile_pic || null
            }
        });
        res.status(200).json({
            message: "User created successfully",
            user: user
        });
    }
    catch (error) {
        console.log("Something went wrong while registering the user", error);
        res.status(500).json({
            message: "Somethign went wrong while registering the user"
        });
    }
});
exports.handleSignUp = handleSignUp;
const loginHandler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        const userExists = yield prisma_1.default.user.findUnique({
            where: { email }
        });
        if (!userExists) {
            res.status(401).json({
                message: "User with this email does not exist"
            });
            return;
        }
        const comparePassword = yield bcrypt_1.default.compare(password, userExists.password);
        if (!comparePassword) {
            res.status(401).json({
                message: "Invalid Password or Email"
            });
            return;
        }
        const jwtToken = jsonwebtoken_1.default.sign({ id: userExists.id }, process.env.JWT_SECRET);
        const options = {
            httpOnly: true,
            secure: true
        };
        res.status(200)
            .cookie("jwtToken", jwtToken, options)
            .json({
            message: "User has been successfully Logged In",
            token: jwtToken,
            userId: userExists.id,
            username: userExists.username,
            profile_pic: userExists.profile_pic
        });
    }
    catch (error) {
        console.log("this is the error", error);
        res.status(500).json({
            message: "Internal Server Error",
            error: error
        });
    }
});
exports.loginHandler = loginHandler;
//controller to protect routes at the frontend 
const checkAuth = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const token = req.cookies.jwtToken;
    if (!token) {
        res.status(401).json({
            message: "Unauthorized User"
        });
        return;
    }
    try {
        const decodedToken = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        res.status(200).json({
            message: "Authenticated",
            token: decodedToken,
        });
    }
    catch (error) {
        console.log("Something went wrong", error);
        res.status(400).json({
            message: "Unauthorized"
        });
    }
});
exports.checkAuth = checkAuth;
const getAllUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    //route to filter user id and its all chat related  users 
    try {
        const users = yield prisma_1.default.user.findMany({
            where: {
                id: { not: id }
            },
            select: {
                id: true,
                username: true,
                email: true
            }
        });
        //get the user who are in chat with the incoming users 
        const userChats = yield prisma_1.default.chatModel.findMany({
            where: {
                isGroup: false,
                users: {
                    some: {
                        userId: id
                    }
                }
            },
            include: {
                users: {
                    select: {
                        userId: true,
                    }
                }
            }
        });
        //extract all the user ids which have a chat with the logged in user 
        const usersToBeFiltered = userChats.flatMap((chat) => chat.users.filter((user) => user.userId !== id).map((user) => user.userId));
        //filter users  by id and send data to frontend 
        const filteredUsers = users.filter(user => !usersToBeFiltered.includes(user.id));
        res.status(200).json({
            message: "Users Fetched Successfully",
            data: filteredUsers
        });
    }
    catch (error) {
        console.log("Something went wrong while fetching the users list");
        res.status(500).json({
            message: "Something went wrong while fetching the data",
            error: error
        });
    }
});
exports.getAllUsers = getAllUsers;
const getUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const users = yield prisma_1.default.user.findMany({
            where: {
                id: { not: id }, // Exclude the user with the given id
            },
            select: {
                id: true,
                username: true,
                profile_pic: true,
                email: true,
            },
        });
        res.status(200).json({
            message: "Users fetched successfully",
            data: users
        });
    }
    catch (error) {
        console.log("Something went wrong while getting users", error);
        res.status(500).json({
            message: "Internal Server Error",
            error: error
        });
    }
});
exports.getUsers = getUsers;
const health = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const token = req.user;
    console.log("this is my fetched token", token);
    res.send("this is the health check router");
});
exports.health = health;
