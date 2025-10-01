import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config({
  path: './.env'
});

//pub sub intialization ( upstash url )
export const pubClient = createClient({
  url: process.env.REDIS_URL
});


// for docker redis 
// export const pubClient = createClient({
//     socket: {
//       host: process.env.REDIS_HOST || 'localhost',
//       port: parseInt(process.env.REDIS_PORT || '6379'),
//     },
//   });

  

export const subClient = pubClient.duplicate();

export const connectRedis = async () => {
  try {
    if (!pubClient.isOpen) await pubClient.connect();
    if (!subClient.isOpen) await subClient.connect();
    console.log("Pub Sub Connected !");
  } catch (error) {
    console.log("Something went wrong while adding the pub sub ", error);
  }
}

pubClient.on('error', err => console.log('Redis Client Error', err));
subClient.on('error', err => console.log('Redis Sub Client Error', err))





