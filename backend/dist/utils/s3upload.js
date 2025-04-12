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
exports.getObjectUrl = exports.postObjectUrl = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({
    path: './.env'
});
//importing the env variables as string because typescript imports env variables as string | undefined
const s3 = new client_s3_1.S3Client({
    region: "ap-south-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});
//using the presignedUrl approach 
function postObjectUrl(dirname, filename, contentType) {
    return __awaiter(this, void 0, void 0, function* () {
        //sending an api request to aws 
        const params = {
            Bucket: "tiru-chatapp",
            Key: dirname + filename,
            ContentType: contentType
        };
        //link expires after 2 mins 
        const expiresIn = 120;
        const url = yield (0, s3_request_presigner_1.getSignedUrl)(s3, new client_s3_1.PutObjectCommand(params), { expiresIn });
        return url;
    });
}
exports.postObjectUrl = postObjectUrl;
const getObjectUrl = (key) => __awaiter(void 0, void 0, void 0, function* () {
    const params = {
        Bucket: 'tiru-chatapp',
        Key: key
    };
    const url = yield (0, s3_request_presigner_1.getSignedUrl)(s3, new client_s3_1.GetObjectCommand(params));
    return url;
});
exports.getObjectUrl = getObjectUrl;
