import { createClient } from 'redis';
import dotenv from 'dotenv'; 

dotenv.config({
    path : './.env'
});
//pub sub intialization
export const pubClient = createClient({
    username: 'default',
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_HOST,
        port: 10307
    }
});

export const subClient = pubClient.duplicate(); 

export const connectRedis= async() => {
 try {
      if(!pubClient.isOpen) await pubClient.connect(); 
      if(!subClient.isOpen) await subClient.connect(); 
      console.log("Pub Sub Connected !");
 } catch (error) {
    console.log("Something went wrong while adding the pub sub " , error);
 }
}

pubClient.on('error', err => console.log('Redis Client Error', err));
subClient.on('error', err => console.log('Redis Sub Client Error', err))





