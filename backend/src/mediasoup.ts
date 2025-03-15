import { Server , Socket } from "socket.io";
import { createWorker } from "./utils/helpers";
import { config } from './utils/config';
import { Producer } from "mediasoup/node/lib/types";
import { createWebRTCTransport } from "./utils/helpers";
import { Router , Transport } from "mediasoup/node/lib/types";

interface Room {
    router: Router;
    producerTransports: { [socketId: string]: Transport };
    consumerTransports: { [socketId: string]: Transport };
    producers: { [socketId: string]: Producer };
}

const rooms: { [meetId: string]: Room } = {}; 

export const setUpMediaSoupServer = (io: Server) => {
    io.on("connection", async (socket: Socket) => {
        let meetId: string | null = null; 

        socket.on("join-meet", async (id: string) => {
            meetId = id;
            socket.join(meetId);
            console.log(`User ${socket.id} joined meet: ${meetId}`);

            if (!rooms[meetId]) {
                // Create room if it doesn't exist
                const worker = await createWorker();
                const router = await worker.createRouter({
                    mediaCodecs: config.mediaSoup.router.mediaCodecs,
                });

                rooms[meetId] = {
                    router,
                    producerTransports: {},
                    consumerTransports: {},
                    producers: {},
                };
            }
        });

        // Create Producer Transport
        socket.on("createProducerTransport", async (_, callback) => {
            try {
                if (!meetId) return callback({ error: "Not in a meeting" });

                const { transport, params } = await createWebRTCTransport(rooms[meetId].router);
                rooms[meetId].producerTransports[socket.id] = transport;

                callback(params);
            } catch (error) {
                console.error("Error creating producer transport:", error);
            }
        });

        // Create Consumer Transport
        socket.on("createConsumerTransport", async (_, callback) => {
            try {
                if (!meetId) return callback({ error: "Not in a meeting" });

                const { transport, params } = await createWebRTCTransport(rooms[meetId].router);
                rooms[meetId].consumerTransports[socket.id] = transport;

                callback(params);
            } catch (error) {
                console.error("Error creating consumer transport:", error);
            }
        });

        // Connect Producer Transport
        socket.on("connectProducerTransport", async (data, callback) => {
            try {
                if (!meetId || !rooms[meetId].producerTransports[socket.id]) return;
                await rooms[meetId].producerTransports[socket.id].connect({ dtlsParameters: data.dtlsParameters });

                callback();
            } catch (error) {
                console.error("Error connecting producer transport:", error);
            }
        });

        // Connect Consumer Transport
        socket.on("connectConsumerTransport", async (data, callback) => {
            try {
                if (!meetId || !rooms[meetId].consumerTransports[socket.id]) return;
                await rooms[meetId].consumerTransports[socket.id].connect({ dtlsParameters: data.dtlsParameters });

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

                rooms[meetId].producers[socket.id] = producer;

                callback({ id: producer.id });

                // Notify others in the room about the new producer
                socket.to(meetId).emit("new-producer", { socketId: socket.id });
            } catch (error) {
                console.error("Error producing media:", error);
            }
        });

        // Consume Media (Subscriber)
        socket.on("consume", async (data, callback) => {
            try {
                if (!meetId || !rooms[meetId].consumerTransports[socket.id]) return;

                const { producerSocketId, rtpCapabilities } = data;
                const producer = rooms[meetId].producers[producerSocketId];

                if (!rooms[meetId].router.canConsume({ producerId: producer.id, rtpCapabilities })) {
                    return callback({ error: "Cannot consume" });
                }

                const consumer = await rooms[meetId].consumerTransports[socket.id].consume({
                    producerId: producer.id,
                    rtpCapabilities,
                    paused: true,
                });

                callback({
                    id: consumer.id,
                    producerId: producerSocketId,
                    kind: consumer.kind,
                    rtpParameters: consumer.rtpParameters,
                });
            } catch (error) {
                console.error("Error consuming media:", error);
            }
        });

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