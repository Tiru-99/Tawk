import express from 'express';
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser';
import {createServer} from 'http'; 
import { Server } from 'socket.io';
import cors from 'cors'
import { setupSocketIOServer } from './socket';
import compression from 'compression';
import { setUpMediaSoupServer } from './mediasoup';
import { connectRedis } from './config/redis';
import { startMessageConsumer } from './config/kafka';
import { SocketService } from './mediasoup/SocketServer';


dotenv.config({
    path:'./.env'
})


const app = express();
const server = createServer(app) ; 
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL ,
    methods : ["GET" , "POST"],
    credentials : true
  },
});

console.log(process.env.FRONTEND_URL);
new SocketService(server); 
setupSocketIOServer(io);
// setUpMediaSoupServer(io);

app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(express.static("public"))
//to compress api requests
app.use(compression());
app.use(cookieParser())
app.use(
    cors({
      origin: process.env.FRONTEND_URL, // Allow only this origin
      methods: ["GET", "POST", "PUT", "DELETE"], // Allowed HTTP methods
      allowedHeaders: ["Content-Type", "Authorization"], // Allowed headers
      credentials: true, // Allow cookies if needed
    })
  );

const PORT = 5000 ; 

//Connect redis on startup
(async () => {
  await connectRedis(); 
})();

//consume kafka streams
startMessageConsumer(); 



app.get('/' , (req, res)=>{
    res.send("hello world this is aayush tirmanwar");
})

//api routes
import authRoute from './routes/auth.routes';
import chatRoute from './routes/chat.routes';
import messageRoute from './routes/message.routes';
import imageUploadRoute from './routes/imageUpload.routes'
import { Socket } from 'dgram';

app.use("/api/v1/user" , authRoute);
app.use("/api/v1/chat" , chatRoute );
app.use("/api/v1/message" , messageRoute);
app.use("/api/v1/upload" , imageUploadRoute);

server.listen(PORT , ()=>{
    console.log(`The server is up and running on PORT ${PORT}`);
})