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
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const socket_1 = require("./socket");
const compression_1 = __importDefault(require("compression"));
const mediasoup_1 = require("./mediasoup");
const redis_1 = require("./config/redis");
dotenv_1.default.config({
    path: './.env'
});
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL,
        methods: ["GET", "POST"],
        credentials: true
    },
});
console.log(process.env.FRONTEND_URL);
(0, socket_1.setupSocketIOServer)(io);
(0, mediasoup_1.setUpMediaSoupServer)(io);
app.use(express_1.default.json({ limit: "16kb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "16kb" }));
app.use(express_1.default.static("public"));
//to compress api requests
app.use((0, compression_1.default)());
app.use((0, cookie_parser_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true, // Allow cookies if needed
}));
const PORT = 5000;
//Connect redis on startup
(() => __awaiter(void 0, void 0, void 0, function* () {
    yield (0, redis_1.connectRedis)();
}))();
app.get('/', (req, res) => {
    res.send("hello world this is aayush tirmanwar");
});
//api routes
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const chat_routes_1 = __importDefault(require("./routes/chat.routes"));
const message_routes_1 = __importDefault(require("./routes/message.routes"));
const imageUpload_routes_1 = __importDefault(require("./routes/imageUpload.routes"));
app.use("/api/v1/user", auth_routes_1.default);
app.use("/api/v1/chat", chat_routes_1.default);
app.use("/api/v1/message", message_routes_1.default);
app.use("/api/v1/upload", imageUpload_routes_1.default);
server.listen(PORT, () => {
    console.log(`The server is up and running on PORT ${PORT}`);
});
