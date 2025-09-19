import { Kafka, Producer } from "kafkajs";
import dotenv from 'dotenv';
import prisma from "../utils/prisma";

dotenv.config({
    path :'./.env'
})

const kafka = new Kafka({
  clientId: 'chat-kafka',
  brokers: [process.env.KAFKA_BROKER!], // no SSL
});


let producer : null | Producer ; 

export const createProducer = async() => {
    if(producer) return producer ; 

    //logic to create producer only once 
    const producer_ = kafka.producer();
    await producer_.connect(); 
    producer = producer_; 
    return producer;  
}

export const produceMessage = async(message : string) => {
    try {
        const producer = await createProducer(); 
        await producer.send({
            messages : [{key : `message-${Date.now()}` , value : message} ],
            topic : "MESSAGES"
        });
        console.log("New Producer created Successfully!");
        return true ; 
    } catch (error) {
        console.error("Something went wrong while sending messages from kafka" ,error);
    }
}

export const startMessageConsumer = async () => {
    const consumer = kafka.consumer({ groupId: "chat-consumer-group" });
  
    await consumer.connect();
    await consumer.subscribe({ topic: "MESSAGES", fromBeginning: true });
  
    await consumer.run({
      eachMessage: async ({ message }) => {
        const parsedMessage = JSON.parse(message.value!.toString());
        const { type , content , mediaUrl , authorId , chatId } = parsedMessage; 

        //store the message in the db 

       try {
        // kafka logic here will be doing it afterwards 
         await prisma.messages.create({
             data :{
                 content, 
                 chatId, 
                 authorId,
                 mediaUrl , 
                 type 
             }
         });
         console.log("Less go message saved to db !!");
       } catch (error) {
        console.log("Something went wrong while saving the message to the db");
       }
      },
    });
  
    console.log("✅ Kafka consumer is listening for messages...");
  };



