import express from 'express';
import dotenv from 'dotenv'
import compression from 'compression';
import cookieParser from 'cookie-parser';
import {createServer} from 'http'; 
import { Server } from 'socket.io';
import cors from 'cors'
import { startMessageConsumer } from './config/kafka';
import { connectRedis } from './config/redis';

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



app.listen(PORT , ()=>{
    console.log(`The server is up and running on PORT ${PORT}`);
})