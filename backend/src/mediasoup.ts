import { Server , Socket } from "socket.io";
import { createMediasoupWorker } from "./utils/helpers";
import { config } from './utils/config';
import { Consumer, Producer } from "mediasoup/node/lib/types";
import { createWebRTCTransport } from "./utils/helpers";
import { Router , Transport } from "mediasoup/node/lib/types";

interface Room {
    router: Router;
    producerTransports: { [socketId: string]: Transport };
    consumerTransports: { [socketId: string]: Transport };
    producers: { [id: string]: Producer };
    consumers : {[id : string] : Consumer}
}


let rooms: { [meetId: string]: Room } = {}; 


export const setUpMediaSoupServer = (io: Server) => {
    io.on("connection", async (socket: Socket) => {
        let meetId: string | null = null; 

        socket.on("join-meet", async (id: string , callback) => {
            meetId = id;
            socket.join(meetId);
            console.log(`User ${socket.id} joined meet: ${meetId}`);
            
            if (!rooms[meetId]) {
                console.log(`Creating new room for ${meetId}`);
                
                let worker;
                try {
                    worker = await createMediasoupWorker();
                    console.log("Worker created successfully:", worker.pid);
                } catch (error) {
                    console.error("Failed to create worker:", error);
                    return callback({ success: false, error: "Worker creation failed" });

                }
                
                if (!worker) {
                    callback({ success: false, error: "Worker creation failed" });
                    return;
                }
                
                let roomRouter;
                try {
                    
                    roomRouter = await worker.createRouter({
                        mediaCodecs: config.mediaSoup.router.mediaCodecs,
                    });

                    rooms[meetId] = {
                        router: roomRouter,
                        producerTransports: {},
                        consumerTransports: {},
                        producers: {},
                        consumers :{}
                    };
                    
                    
                    console.log("Router created successfully:", roomRouter.id);
                } catch (error) {
                    console.error("Failed to create router:", error);
                    return;
                }
                
                console.log(`Room ${meetId} created with new router ${roomRouter.id}`);
            } else {
                console.log(`User ${socket.id} joined existing room: ${meetId}`);
            }
            
            // Use the room's router directly instead of the global variable
            const roomRouter = rooms[meetId].router;
            if (!roomRouter) {
                console.error(`Router not found for room ${meetId}`);
                callback({ success: false, error: "Router not found for the room" });

                return;
            }

            callback({success : true});
            
        });
        

        //get router rtp capabilities 
        socket.on("getRouterRtpCapabilities" , async(data , callback)=>{
        
            if(!meetId || !rooms[meetId]){
                console.error("Cannot get router capabilities: No active meeting");
                callback({ error: "No active meeting" });
                return;
            }

            const router = rooms[meetId].router;
            console.log("This is my router in the rtp part" , router);
            if(!router){
                console.error(`Router not found for room ${meetId}`);
                callback({ error: "Router not found" });
                return;
            }
            await callback(router.rtpCapabilities);
        })

        // Create Producer Transport
        socket.on("createProducerTransport", async (_, callback) => {
            try {
                if (!meetId) return callback({ error: "Not in a meeting" });

                const { transport, params } = await createWebRTCTransport(rooms[meetId].router);
                rooms[meetId].producerTransports[socket.id] = transport;

                callback({...params , socketId : socket.id});
            } catch (error) {
                console.error("Error creating producer transport:", error);
            }
        });

        // Create Consumer Transport
        socket.on("createConsumerTransport", async (_, callback) => {
            try {

                if (!meetId) return callback({ error: "Not in a meeting" });
                console.log("Room is " , rooms);

                console.log("here the router is " , rooms[meetId].router);

                const { transport, params } = await createWebRTCTransport(rooms[meetId].router);
                
                rooms[meetId].consumerTransports[socket.id] = transport;
                console.log("Consumer Transports" , rooms[meetId].consumerTransports[socket.id])

                callback({...params , socketId : socket.id});
            } catch (error) {
                console.error("Error creating consumer transport:", error);
            }
        });

        // Connect Producer Transport
        socket.on("connectProducerTransport", async (data, callback) => {
            try {
                if (!meetId || !rooms[meetId].producerTransports[socket.id]) return;
                await rooms[meetId].producerTransports[data.socketId].connect({ dtlsParameters: data.dtlsParameters });

            } catch (error) {
                console.error("Error connecting producer transport:", error);
            }
        });

        // Connect Consumer Transport
        socket.on("connectConsumerTransport", async (data, callback) => {
            console.log("The code is reaching connection phase successfully");
            try {
                if (!meetId || !rooms[meetId].consumerTransports[data.socketId]|| !data.socketId) return;

                await rooms[meetId].consumerTransports[data.socketId].connect({ dtlsParameters: data.dtlsParameters });

                callback();
            } catch (error) {
                console.error("Error connecting consumer transport:", error);
            }
        });

        // Produce Media (Publisher)
        socket.on("produce", async (data, callback) => {
            try {
                
                if (!meetId || !rooms[meetId].producerTransports[socket.id]) return;

                const { kind, rtpParameters } = data;
                const producer = await rooms[meetId].producerTransports[socket.id].produce({ kind, rtpParameters });
                const socketId = socket.id; 
                console.log("The producer type is ",producer.kind);
                rooms[meetId].producers[producer.id] = producer;

                callback({ id: producer.id , producerSocketId : socketId});
                const producerId = producer.id; 
                // Notify others in the room about the new producer
                socket.broadcast.emit("newProducer", producerId);

            } catch (error) {
                console.error("Error producing media:", error);
            }
        });

        //get producers 
        socket.on("getProducers" , async( data , callback)=> {
            const {id} = data; 
            if(!rooms[id]){
                return callback({error : "Room not found"});
            }

            console.log(rooms[id].producers);

            const producerIds = Object.values(rooms[id].producers).map((producer)=>producer.id);
            console.log("producer Ids" , producerIds);

            callback(producerIds);
        })

        // Consume Media (Subscriber)
        socket.on("consume", async (data, callback) => {
            try {
                if (!meetId || !rooms[meetId].consumerTransports[socket.id]) return;

                const { producerId, rtpCapabilities } = data;
                const producer = rooms[meetId].producers[producerId];


                if (!rooms[meetId].router.canConsume({ producerId: producerId, rtpCapabilities })) {
                    return callback({ error: "Cannot consume" });
                }

                const consumer = await rooms[meetId].consumerTransports[socket.id].consume({
                    producerId: producer.id,
                    rtpCapabilities,
                    paused: false,
                });

                rooms[meetId].consumers[consumer.id] = consumer ;

                callback({
                    id: consumer.id,
                    producerId: producerId,
                    kind: consumer.kind,
                    rtpParameters: consumer.rtpParameters,
                });
            } catch (error) {
                console.error("Error consuming media:", error);
            }
        });

        socket.on("consumer-resume" , async({consumerId})=>{
            console.log("Inside the consumer resuming part ");
            if(!consumerId || !meetId) return null ;
            const consumer = rooms[meetId].consumers[consumerId];

            if(consumer) await consumer.resume(); 
        })

        // Handle Disconnection
        socket.on("disconnect", () => {
            if (!meetId || !rooms[meetId]) return;

            console.log(`User ${socket.id} disconnected from meet: ${meetId}`);

            delete rooms[meetId].producerTransports[socket.id];
            delete rooms[meetId].consumerTransports[socket.id];
            delete rooms[meetId].producers[socket.id];

            // Cleanup empty rooms
            if (
                Object.keys(rooms[meetId].producerTransports).length === 0 &&
                Object.keys(rooms[meetId].consumerTransports).length === 0
            ) {
                delete rooms[meetId];
            }
        });
    });
};