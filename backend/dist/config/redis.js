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
exports.connectRedis = exports.subClient = exports.pubClient = void 0;
const redis_1 = require("redis");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({
    path: './.env'
});
//pub sub intialization
exports.pubClient = (0, redis_1.createClient)({
    username: 'default',
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_HOST,
        port: 10307
    }
});
exports.subClient = exports.pubClient.duplicate();
const connectRedis = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!exports.pubClient.isOpen)
            yield exports.pubClient.connect();
        if (!exports.subClient.isOpen)
            yield exports.subClient.connect();
        console.log("Pub Sub Connected !");
    }
    catch (error) {
        console.log("Something went wrong while adding the pub sub ", error);
    }
});
exports.connectRedis = connectRedis;
exports.pubClient.on('error', err => console.log('Redis Client Error', err));
exports.subClient.on('error', err => console.log('Redis Sub Client Error', err));
