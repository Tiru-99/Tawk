import express from 'express';
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser';
import {createServer} from 'http'; 
import { Server } from 'socket.io';

dotenv.config({
    path:'./.env'
})


const app = express();
const server = createServer(app) ; 
const io = new Server(server);

app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(express.static("public"))
app.use(cookieParser())

const PORT = 5000 ; 


app.get('/' , (req, res)=>{
    res.send("hello world this is aayush tirmanwar");
})

//api routes
import authRoute from './routes/auth.routes'
import chatRoute from './routes/chat.routes'

app.use("/api/v1/user" , authRoute);
app.use("/api/v1/chat" , chatRoute )

server.listen(PORT , ()=>{
    console.log(`The server is up and running on PORT ${PORT}`);
})