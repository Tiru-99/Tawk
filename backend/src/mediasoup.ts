import { Server , Socket } from "socket.io";
import { createMediasoupWorker } from "./utils/helpers";
import { config } from './utils/config';
import { Consumer, Producer } from "mediasoup/node/lib/types";
import { createWebRTCTransport } from "./utils/helpers";
import { Router , Transport } from "mediasoup/node/lib/types";

interface Room {
    router: Router;
    producerTransports: { [socketId: string]: Transport };
    consumerTransports: { [socketId: string]: {audio : Transport  , video : Transport} };
    producers: { [id: string]: {audio : Producer | null , video : Producer | null}};
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
        socket.on("createConsumerTransport", async (data, callback) => {
            try {

                if (!meetId) return callback({ error: "Not in a meeting" });
                console.log("Room is " , rooms);

                const { kind } = data; 

                if(!["video" , "audio"].includes(kind)){
                    callback({error : "Invalid Kind"});
                    return; 
                }

                console.log("here the router is " , rooms[meetId].router);

                if (!rooms[meetId].consumerTransports[socket.id]) {
                    rooms[meetId].consumerTransports[socket.id] = {} as any;
                }

                // Initialize the consumerTransports[socket.id] object if not already
                // possible chances of errors here 
                // if (!rooms[meetId].consumerTransports[socket.id]) {
                //     rooms[meetId].consumerTransports[socket.id] = { audio: null, video: null };
                // }

                if(kind === "audio"){
                    const { transport, params } = await createWebRTCTransport(rooms[meetId].router);
                    rooms[meetId].consumerTransports[socket.id].audio = transport;
                    callback({...params , socketId : socket.id});
                } else{
                    const { transport , params} = await createWebRTCTransport(rooms[meetId].router);
                    rooms[meetId].consumerTransports[socket.id].video = transport;
                    callback({...params , socketId : socket.id});
                }
                
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

                const kind = data.kind 
                
                if(!["audio" , "video"].includes(kind)){
                    callback({erorr : "Invalid Kind"});
                }

                if(kind === "audio"){
                    await rooms[meetId].consumerTransports[data.socketId].audio.connect({ dtlsParameters: data.dtlsParameters });
                }else {
                    await rooms[meetId].consumerTransports[data.socketId].video.connect({ dtlsParameters: data.dtlsParameters });
                }

                callback();
            } catch (error) {
                console.error("Error connecting consumer transport:", error);
            }
        });

        // Produce Media (Publisher)
       // Produce Media (Publisher)
        socket.on("produce", async (data, callback) => {
            try {
                if (!meetId || !rooms[meetId].producerTransports[socket.id]) return;

                const { kind, rtpParameters } = data;

                if (!["video", "audio"].includes(kind)) {
                    callback({ error: "Invalid Kind" });
                    return;
                }

                const producer = await rooms[meetId].producerTransports[socket.id].produce({
                    kind,
                    rtpParameters
                });

                const producerId = producer.id;

                // Initialize if not already
                rooms[meetId].producers[producerId] = {} as any;

                // Store the producer based on kind
                if (kind === "audio") {
                    rooms[meetId].producers[producerId].audio = producer;
                } else {
                    rooms[meetId].producers[producerId].video = producer;
                }

                const socketId = socket.id;

                callback({ id: producerId, producerSocketId: socketId , kind});

                // Notify others in the room about the new producer
                socket.broadcast.emit("newProducer", {producerId , kind});

            } catch (error) {
                console.error("Error producing media:", error);
                callback({ error: "Internal server error" });
            }
        });


            //get producers 
            // Get producers
            socket.on("getProducers", async (data, callback) => {
                const { id } = data;
            
                if (!rooms[id]) {
                    return callback({ error: "Room not found" });
                }
            
                const producerEntries = Object.values(rooms[id].producers);
            
                const producerInfo: { id: string; kind: "audio" | "video" }[] = [];
            
                for (const producerPair of producerEntries) {
                    if (producerPair.audio) {
                        producerInfo.push({ id: producerPair.audio.id, kind: "audio" });
                    }
                    if (producerPair.video) {
                        producerInfo.push({ id: producerPair.video.id, kind: "video" });
                    }
                }
            
                console.log("Producer Info:", producerInfo);
            
                callback(producerInfo);
            });
            

        // Consume Media (Subscriber)
        socket.on("consume", async (data, callback) => {
            try {
                console.log("The code is reaching the consumer consume part! ");
                if (!meetId || !rooms[meetId].consumerTransports[socket.id]) return;

                const { producerId, rtpCapabilities , kind } = data;
                let producer; 

                if(!["video" , "audio"].includes(kind)){
                    callback({error : "Invalid Kind "});
                }

                if (!rooms[meetId].router.canConsume({ producerId: producerId, rtpCapabilities })) {
                    return callback({ error: "Cannot consume" });
                }

                if(kind === "audio"){
                    producer = rooms[meetId].producers[producerId].audio;
                    if(!producer){
                        callback({error : "No Producer in the consume section found"})
                        return ; 
                    }
                    const consumer = await rooms[meetId].consumerTransports[socket.id].audio.consume({
                        producerId: producer?.id,
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
                } else {
                    producer = rooms[meetId].producers[producerId].video;
                    if(!producer){
                        callback({error : "No Producer in the consume section found"});
                        return; 
                    }
                    const consumer = await rooms[meetId].consumerTransports[socket.id].video.consume({
                        producerId : producer?.id,
                        rtpCapabilities, 
                        paused : true,
                    });

                    rooms[meetId].consumers[consumer.id] = consumer;
                    callback({
                        id : consumer.id , 
                        producerId : producerId , 
                        kind : consumer.kind ,
                        rtpParameters : consumer.rtpParameters
                    })
                }


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