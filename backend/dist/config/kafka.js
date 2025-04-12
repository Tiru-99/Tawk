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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const kafkajs_1 = require("kafkajs");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const kafka = new kafkajs_1.Kafka({
    clientId: "chat-kafka",
    brokers: ["chat-kafka-aayushtirmanwar1234-b7c5.k.aivencloud.com:12347"],
    ssl: {
        rejectUnauthorized: true,
        ca: [fs_1.default.readFileSync(path_1.default.resolve("./ca.pem"), "utf-8")],
        cert: fs_1.default.readFileSync(path_1.default.resolve("./service.cert"), "utf-8"),
        key: fs_1.default.readFileSync(path_1.default.resolve("./service.key"), "utf-8"),
    },
    // No sasl block needed in pure SSL auth
});
const producer = kafka.producer();
const sendMessage = () => __awaiter(void 0, void 0, void 0, function* () {
    yield producer.connect();
    yield producer.send({
        topic: "chat-topic",
        messages: [{ value: "Hey this is tiru from kafka" }]
    });
    console.log("Producer Connected! ");
    yield producer.disconnect();
});
sendMessage().catch(console.error);
const consumer = kafka.consumer({ groupId: 'chat-topic' });
const receiveMessages = () => __awaiter(void 0, void 0, void 0, function* () {
    yield consumer.connect();
    yield consumer.subscribe({ topic: 'chat-topic', fromBeginning: true });
    yield consumer.run({
        eachMessage: ({ topic, partition, message }) => __awaiter(void 0, void 0, void 0, function* () {
            if (!message.value) {
                return;
            }
            console.log(`🧾 Received: ${message.value.toString()}`);
        }),
    });
});
receiveMessages().catch(console.error);
