"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setUpMediaSoupServer = void 0;
const helpers_1 = require("./utils/helpers");
const config_1 = require("./utils/config");
const helpers_2 = require("./utils/helpers");
let rooms = {};
const setUpMediaSoupServer = (io) => {
    io.on("connection", (socket) => __awaiter(void 0, void 0, void 0, function* () {
        let meetId = null;
        socket.on("join-meet", (id, callback) => __awaiter(void 0, void 0, void 0, function* () {
            meetId = id;
            socket.join(meetId);
            console.log(`User ${socket.id} joined meet: ${meetId}`);
            if (!rooms[meetId]) {
                console.log(`Creating new room for ${meetId}`);
                let worker;
                try {
                    worker = yield (0, helpers_1.createMediasoupWorker)();
                    console.log("Worker created successfully:", worker.pid);
                }
                catch (error) {
                    console.error("Failed to create worker:", error);
                    return callback({ success: false, error: "Worker creation failed" });
                }
                if (!worker) {
                    callback({ success: false, error: "Worker creation failed" });
                    return;
                }
                let roomRouter;
                try {
                    roomRouter = yield worker.createRouter({
                        mediaCodecs: config_1.config.mediaSoup.router.mediaCodecs,
                    });
                    rooms[meetId] = {
                        router: roomRouter,
                        producerTransports: {},
                        consumerTransports: {},
                        producers: {},
                        consumers: {}
                    };
                    console.log("Router created successfully:", roomRouter.id);
                }
                catch (error) {
                    console.error("Failed to create router:", error);
                    return;
                }
                console.log(`Room ${meetId} created with new router ${roomRouter.id}`);
            }
            else {
                console.log(`User ${socket.id} joined existing room: ${meetId}`);
            }
            // Use the room's router directly instead of the global variable
            const roomRouter = rooms[meetId].router;
            if (!roomRouter) {
                console.error(`Router not found for room ${meetId}`);
                callback({ success: false, error: "Router not found for the room" });
                return;
            }
            callback({ success: true });
        }));
        //get router rtp capabilities 
        socket.on("getRouterRtpCapabilities", (data, callback) => __awaiter(void 0, void 0, void 0, function* () {
            if (!meetId || !rooms[meetId]) {
                console.error("Cannot get router capabilities: No active meeting");
                callback({ error: "No active meeting" });
                return;
            }
            const router = rooms[meetId].router;
            console.log("This is my router in the rtp part", router);
            if (!router) {
                console.error(`Router not found for room ${meetId}`);
                callback({ error: "Router not found" });
                return;
            }
            yield callback(router.rtpCapabilities);
        }));
        // Create Producer Transport
        socket.on("createProducerTransport", (_, callback) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                if (!meetId)
                    return callback({ error: "Not in a meeting" });
                const { transport, params } = yield (0, helpers_2.createWebRTCTransport)(rooms[meetId].router);
                rooms[meetId].producerTransports[socket.id] = transport;
                callback(Object.assign(Object.assign({}, params), { socketId: socket.id }));
            }
            catch (error) {
                console.error("Error creating producer transport:", error);
            }
        }));
        // Create Consumer Transport
        socket.on("createConsumerTransport", (data, callback) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                if (!meetId)
                    return callback({ error: "Not in a meeting" });
                console.log("Room is ", rooms);
                const { kind } = data;
                if (!["video", "audio"].includes(kind)) {
                    callback({ error: "Invalid Kind" });
                    return;
                }
                console.log("here the router is ", rooms[meetId].router);
                if (!rooms[meetId].consumerTransports[socket.id]) {
                    rooms[meetId].consumerTransports[socket.id] = {};
                }
                // Initialize the consumerTransports[socket.id] object if not already
                // possible chances of errors here 
                // if (!rooms[meetId].consumerTransports[socket.id]) {
                //     rooms[meetId].consumerTransports[socket.id] = { audio: null, video: null };
                // }
                if (kind === "audio") {
                    const { transport, params } = yield (0, helpers_2.createWebRTCTransport)(rooms[meetId].router);
                    rooms[meetId].consumerTransports[socket.id].audio = transport;
                    callback(Object.assign(Object.assign({}, params), { socketId: socket.id }));
                }
                else {
                    const { transport, params } = yield (0, helpers_2.createWebRTCTransport)(rooms[meetId].router);
                    rooms[meetId].consumerTransports[socket.id].video = transport;
                    callback(Object.assign(Object.assign({}, params), { socketId: socket.id }));
                }
            }
            catch (error) {
                console.error("Error creating consumer transport:", error);
            }
        }));
        // Connect Producer Transport
        socket.on("connectProducerTransport", (data, callback) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                if (!meetId || !rooms[meetId].producerTransports[socket.id])
                    return;
                yield rooms[meetId].producerTransports[data.socketId].connect({ dtlsParameters: data.dtlsParameters });
            }
            catch (error) {
                console.error("Error connecting producer transport:", error);
            }
        }));
        // Connect Consumer Transport
        socket.on("connectConsumerTransport", (data, callback) => __awaiter(void 0, void 0, void 0, function* () {
            console.log("The code is reaching connection phase successfully");
            try {
                if (!meetId || !rooms[meetId].consumerTransports[data.socketId] || !data.socketId)
                    return;
                const kind = data.kind;
                if (!["audio", "video"].includes(kind)) {
                    callback({ erorr: "Invalid Kind" });
                }
                if (kind === "audio") {
                    yield rooms[meetId].consumerTransports[data.socketId].audio.connect({ dtlsParameters: data.dtlsParameters });
                }
                else {
                    yield rooms[meetId].consumerTransports[data.socketId].video.connect({ dtlsParameters: data.dtlsParameters });
                }
                callback();
            }
            catch (error) {
                console.error("Error connecting consumer transport:", error);
            }
        }));
        // Produce Media (Publisher)
        // Produce Media (Publisher)
        socket.on("produce", (data, callback) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                if (!meetId || !rooms[meetId].producerTransports[socket.id])
                    return;
                const { kind, rtpParameters } = data;
                if (!["video", "audio"].includes(kind)) {
                    callback({ error: "Invalid Kind" });
                    return;
                }
                const producer = yield rooms[meetId].producerTransports[socket.id].produce({
                    kind,
                    rtpParameters
                });
                const producerId = producer.id;
                // Initialize if not already
                rooms[meetId].producers[producerId] = {};
                // Store the producer based on kind
                if (kind === "audio") {
                    rooms[meetId].producers[producerId].audio = producer;
                }
                else {
                    rooms[meetId].producers[producerId].video = producer;
                }
                const socketId = socket.id;
                callback({ id: producerId, producerSocketId: socketId, kind });
                // Notify others in the room about the new producer
                socket.broadcast.emit("newProducer", { producerId, kind });
            }
            catch (error) {
                console.error("Error producing media:", error);
                callback({ error: "Internal server error" });
            }
        }));
        //get producers 
        // Get producers
        socket.on("getProducers", (data, callback) => __awaiter(void 0, void 0, void 0, function* () {
            const { id } = data;
            if (!rooms[id]) {
                return callback({ error: "Room not found" });
            }
            const producerEntries = Object.values(rooms[id].producers);
            const producerInfo = [];
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
        }));
        // Consume Media (Subscriber)
        socket.on("consume", (data, callback) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                console.log("The code is reaching the consumer consume part! ");
                if (!meetId || !rooms[meetId].consumerTransports[socket.id])
                    return;
                const { producerId, rtpCapabilities, kind } = data;
                let producer;
                if (!["video", "audio"].includes(kind)) {
                    callback({ error: "Invalid Kind " });
                }
                if (!rooms[meetId].router.canConsume({ producerId: producerId, rtpCapabilities })) {
                    return callback({ error: "Cannot consume" });
                }
                if (kind === "audio") {
                    producer = rooms[meetId].producers[producerId].audio;
                    if (!producer) {
                        callback({ error: "No Producer in the consume section found" });
                        return;
                    }
                    const consumer = yield rooms[meetId].consumerTransports[socket.id].audio.consume({
                        producerId: producer === null || producer === void 0 ? void 0 : producer.id,
                        rtpCapabilities,
                        paused: false,
                    });
                    rooms[meetId].consumers[consumer.id] = consumer;
                    callback({
                        id: consumer.id,
                        producerId: producerId,
                        kind: consumer.kind,
                        rtpParameters: consumer.rtpParameters,
                    });
                }
                else {
                    producer = rooms[meetId].producers[producerId].video;
                    if (!producer) {
                        callback({ error: "No Producer in the consume section found" });
                        return;
                    }
                    const consumer = yield rooms[meetId].consumerTransports[socket.id].video.consume({
                        producerId: producer === null || producer === void 0 ? void 0 : producer.id,
                        rtpCapabilities,
                        paused: false,
                    });
                    rooms[meetId].consumers[consumer.id] = consumer;
                    callback({
                        id: consumer.id,
                        producerId: producerId,
                        kind: consumer.kind,
                        rtpParameters: consumer.rtpParameters
                    });
                }
            }
            catch (error) {
                console.error("Error consuming media:", error);
            }
        }));
        socket.on("consumer-resume", ({ consumerId }) => __awaiter(void 0, void 0, void 0, function* () {
            console.log("Inside the consumer resuming part ");
            if (!consumerId || !meetId)
                return null;
            const consumer = rooms[meetId].consumers[consumerId];
            if (consumer)
                yield consumer.resume();
        }));
        // Handle Disconnection
        socket.on("disconnect", () => {
            if (!meetId || !rooms[meetId])
                return;
            console.log(`User ${socket.id} disconnected from meet: ${meetId}`);
            delete rooms[meetId].producerTransports[socket.id];
            delete rooms[meetId].consumerTransports[socket.id];
            delete rooms[meetId].producers[socket.id];
            // Cleanup empty rooms
            if (Object.keys(rooms[meetId].producerTransports).length === 0 &&
                Object.keys(rooms[meetId].consumerTransports).length === 0) {
                delete rooms[meetId];
            }
        });
    }));
};
exports.setUpMediaSoupServer = setUpMediaSoupServer;
