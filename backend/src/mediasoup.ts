import { Server , Socket } from "socket.io";
import { createMediasoupWorker } from "./utils/helpers";
import { config } from './utils/config';
import { Consumer, Producer } from "mediasoup/types";
import { createWebRTCTransport } from "./utils/helpers";
import { Router , Transport } from "mediasoup/types";
//this part of code has no  use it is just for reference

// interface Room {
//     router: Router;
//     producerTransports: { [socketId: string]: Transport };
//     consumerTransports: { [socketId: string]: Transport };
//     producers: { [id: string]: {audio : Producer | null , video : Producer | null}};
//     consumers : {[id : string] : Consumer}
// }

interface Room {
    router : Router ; 
    users : {
        [userId : string]:{
            producerTransports : {[ socketId : string ] : Transport} ;
            consumerTransports : {[socketId : string] : Transport} ;
            producers : {[id : string] : {audio : Producer | null , video : Producer | null}};
            consumers : {[id : string] : Consumer}
        }
    }
}

let rooms: { [meetId: string]: Room } = {}; 


export const setUpMediaSoupServer = (io: Server) => {
    io.on("connection", async (socket: Socket) => {
        let meetId: string | null = null; 
        let roomUserId : string ; 

        socket.on("join-meet", async (data : {id : string , userId : string} , callback) => {
            const { id , userId} = data; 
            meetId = id;
            roomUserId = userId ; 
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
                        users: {
                            [roomUserId]: {
                                producerTransports: {},
                                consumerTransports: {},
                                producers: {},
                                consumers: {}
                            }
                        }
                    };
                    
                    console.log("the users are , " , rooms[meetId].users);
                    console.log("Router created successfully:", roomRouter.id , roomUserId);
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
                if (!meetId || !roomUserId ) return callback({ error: "Not in a meeting" });

                if (!rooms[meetId].users[roomUserId]) {
                    rooms[meetId].users[roomUserId] = {
                        producerTransports: {},
                        consumerTransports: {},
                        producers: {},
                        consumers: {}
                    };
                }

                const { transport, params } = await createWebRTCTransport(rooms[meetId].router);
                rooms[meetId].users[roomUserId].producerTransports[socket.id] = transport;

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

                if (!rooms[meetId].users[roomUserId]) {
                    rooms[meetId].users[roomUserId] = {
                        producerTransports: {},
                        consumerTransports: {},
                        producers: {},
                        consumers: {}
                    };
                }

                console.log("here the router is " , rooms[meetId].router);

                if (!rooms[meetId].users[roomUserId].consumerTransports[socket.id]) {
                    rooms[meetId].users[roomUserId].consumerTransports[socket.id] = {} as any;
                }
                // Initialize the consumerTransports[socket.id] object if not already
                // possible chances of errors here 
                // if (!rooms[meetId].consumerTransports[socket.id]) {
                //     rooms[meetId].consumerTransports[socket.id] = { audio: null, video: null };
                // }

                const {transport , params} = await createWebRTCTransport(rooms[meetId].router) ; 
                rooms[meetId].users[roomUserId].consumerTransports[socket.id] = transport; 
                callback({...params , socketId : socket.id});
                
            } catch (error) {
                console.error("Error creating consumer transport:", error);
            }
        });

        // Connect Producer Transport
        socket.on("connectProducerTransport", async (data, callback) => {
            try {
                if (!meetId || !rooms[meetId].users[roomUserId].producerTransports[socket.id]) return;
                console.log("the producer transport is " , rooms[meetId].users[roomUserId].producerTransports[socket.id])
                await rooms[meetId].users[roomUserId].producerTransports[data.socketId].connect({ dtlsParameters: data.dtlsParameters });

            } catch (error) {
                console.error("Error connecting producer transport:", error);
            }
        });

        // Connect Consumer Transport
        socket.on("connectConsumerTransport", async (data, callback) => {
            console.log("The code is reaching connection phase successfully");
            try {
                if (!meetId || !rooms[meetId].users[roomUserId].consumerTransports[data.socketId]|| !data.socketId) return;

                await rooms[meetId].users[roomUserId].consumerTransports[data.socketId].connect({dtlsParameters : data.dtlsParameters}); 

                callback();
            } catch (error) {
                console.error("Error connecting consumer transport:", error);
            }
        });

        // Produce Media (Publisher)
       // Produce Media (Publisher)
        socket.on("produce", async (data, callback) => {
            try {
                if (!meetId || !rooms[meetId].users[roomUserId].producerTransports[socket.id]) return;

                const { kind, rtpParameters } = data;

                if (!["video", "audio"].includes(kind)) {
                    callback({ error: "Invalid Kind" });
                    return;
                }

                const producer = await rooms[meetId].users[roomUserId].producerTransports[socket.id].produce({
                    kind,
                    rtpParameters
                });

                console.log("the producer which is created is " , producer, producer.kind);

                const producerId = producer.id;

                // Initialize if not already
                rooms[meetId].users[roomUserId].producers[producerId] = {} as any;

                // Store the producer based on kind
                if (kind === "audio") {
                    rooms[meetId].users[roomUserId].producers[producerId].audio = producer;
                } else {
                    rooms[meetId].users[roomUserId].producers[producerId].video = producer;
                }

                const socketId = socket.id;
                console.log(rooms[meetId].users[roomUserId].producers)
                callback({ id: producerId, producerSocketId: socketId , kind});
                console.log("The final created producers are " , rooms[meetId].users[roomUserId].producers)
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
                console.log("Get producer socket at the backend invoked");
            
                if (!rooms[id]) {
                    return callback({ error: "Room not found" });
                }
            
                const producerEntries = Object.values(rooms[id].users[roomUserId].producers);
                console.log("The producer Entries are " , producerEntries);
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
                if (!meetId || !rooms[meetId].users[roomUserId].consumerTransports[socket.id]) return;

                const { producerId, rtpCapabilities , kind} = data;
                console.log("the consumertransport to check is " , rooms[meetId].users[roomUserId].consumerTransports[socket.id]);
                console.log("the producerid recieved in the consume backend is" , producerId); 
                let producer; 


                if (!rooms[meetId].router.canConsume({ producerId: producerId, rtpCapabilities })) {
                    return callback({ error: "Cannot consume" });
                }



                if(kind === "audio"){
                    console.dir("The producers to consumer are" , rooms[meetId].users[roomUserId].producers[producerId]);
                    producer = rooms[meetId].users[roomUserId].producers[producerId].audio;
                    if(!producer){
                        callback({error : "No Producer in the consume section found"})
                        return ; 
                    }
                    const consumer = await rooms[meetId].users[roomUserId].consumerTransports[socket.id].consume({
                        producerId: producer?.id,
                        rtpCapabilities,
                        paused: false,
                    });
    
                    rooms[meetId].users[roomUserId].consumers[consumer.id] = consumer ;
    
                    callback({
                        id: consumer.id,
                        producerId: producerId,
                        kind: consumer.kind,
                        rtpParameters: consumer.rtpParameters,
                    });
                } else {
                    console.log("the video consumer producer is " , rooms[meetId].users[roomUserId]);
                    producer = rooms[meetId].users[roomUserId].producers[producerId].video;
                    if(!producer){
                        callback({error : "No Producer in the consume section found"});
                        return; 
                    }
                    const consumer = await rooms[meetId].users[roomUserId].consumerTransports[socket.id].consume({
                        producerId : producer?.id,
                        rtpCapabilities, 
                        paused : true,
                    });

                    rooms[meetId].users[roomUserId].consumers[consumer.id] = consumer;
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
            const consumer = rooms[meetId].users[roomUserId].consumers[consumerId];

            if(consumer) await consumer.resume(); 
        })

        // Handle Disconnection
        socket.on("disconnect", () => {
            if (!meetId || !rooms[meetId]) return;

            console.log(`User ${socket.id} disconnected from meet: ${meetId}`);

            delete rooms[meetId].users[roomUserId].producerTransports[socket.id];
            delete rooms[meetId].users[roomUserId].consumerTransports[socket.id];
            delete rooms[meetId].users[roomUserId].producers[socket.id];

            // Cleanup empty rooms
            if (
                Object.keys(rooms[meetId].users[roomUserId].producerTransports).length === 0 &&
                Object.keys(rooms[meetId].users[roomUserId].consumerTransports).length === 0
            ) {
                delete rooms[meetId];
            }
        });
    });
};