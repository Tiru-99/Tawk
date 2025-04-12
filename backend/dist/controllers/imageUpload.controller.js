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
exports.getProfilePic = exports.getPresignedUrl = exports.uploadProfilePic = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const s3upload_1 = require("../utils/s3upload");
const uuid_1 = require("uuid");
const uploadProfilePic = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        //fetch the image name , and its type from frontend
        const { id } = req.params;
        const { fileType } = req.query;
        console.log("File Type : ", fileType);
        let url = yield (0, s3upload_1.postObjectUrl)('/profile_pic/', `profile_pic_${id}`, fileType);
        res.status(200).json({
            message: "Url fetched successfully",
            url: url
        });
    }
    catch (error) {
        res.status(400).json({
            message: "Something went wrong while fetching the url",
            error: error
        });
        return;
    }
});
exports.uploadProfilePic = uploadProfilePic;
const getPresignedUrl = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const fileType = req.query.fileType || "image/jpeg";
    const parsedFileType = JSON.stringify(fileType);
    const fileName = `${(0, uuid_1.v4)()}.${parsedFileType.split("/")[1]}`;
    try {
        let url = yield (0, s3upload_1.postObjectUrl)('/chat_pics/', `${fileName}`, fileType);
        res.status(200).send({
            message: "Url fetched successfully",
            url: url,
            key: "/chat_pics/" + fileName
        });
    }
    catch (error) {
        console.log("Something went wrong while getting presigned url", error);
        res.status(500).send({
            message: "Something went wrong while getting presigned url",
            error: error
        });
    }
});
exports.getPresignedUrl = getPresignedUrl;
const getProfilePic = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const imageUrl = yield (0, s3upload_1.getObjectUrl)(`/profile_pic/profile_pic_${id}`);
        //update the image in the database with every get object call
        yield prisma_1.default.user.update({
            where: {
                id: id
            },
            data: {
                profile_pic: imageUrl
            }
        });
        // Sending image url 
        res.status(201).json({
            message: "Successfully fetched the imageUrl",
            url: imageUrl
        });
    }
    catch (error) {
        console.error("Error fetching image URL:", error);
        res.status(500).json({ error: "Failed to fetch profile picture" });
        return;
    }
});
exports.getProfilePic = getProfilePic;
