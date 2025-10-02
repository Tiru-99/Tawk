import express from 'express';
import dotenv from 'dotenv'
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors'
import { startMessageConsumer } from './config/kafka';
import { connectRedis } from './config/redis';
import { SocketIoServer } from './socket';
import { SocketService } from './mediasoup/SocketServer';

dotenv.config({
  path: './.env'
})

console.log("the frontend url is " , process.env.FRONTEND_URL);
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST"],
    credentials: true
  },
});

app.use(
  cors({
    origin: process.env.FRONTEND_URL, // Allow only this origin
    methods: ["GET", "POST", "PUT", "DELETE"], // Allowed HTTP methods
    allowedHeaders: ["Content-Type", "Authorization"], // Allowed headers
    credentials: true, // Allow cookies if needed
  })
);


SocketIoServer(io)
new SocketService(io)
// setUpMediaSoupServer(io);


app.use(express.json({ limit: "16kb" }))
app.use(express.urlencoded({ extended: true, limit: "16kb" }))
app.use(express.static("public"))
//to compress api requests
app.use(compression());
app.use(cookieParser())
app.set("trust-proxy" , 1); 

const PORT = 5000;

//Connect redis on startup
(async () => {
  await connectRedis();
})();

//consume kafka streams
startMessageConsumer();

app.get('/', (req, res) => {
  res.send("hello world this is aayush tirmanwar");
})


//api routes
import authRoute from './routes/auth.routes';
import chatRoute from './routes/chat.routes';
import messageRoute from './routes/message.routes';
import imageUploadRoute from './routes/imageUpload.routes';


app.use("/api/v1/user", authRoute);
app.use("/api/v1/chat", chatRoute);
app.use("/api/v1/message", messageRoute);
app.use("/api/v1/upload", imageUploadRoute);

server.listen(PORT, () => {
  console.log(`The server is up and running on PORT ${PORT}`);
})

//test comment