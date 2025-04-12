"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.config = {
    mediaSoup: {
        router: {
            mediaCodecs: [
                {
                    kind: "audio",
                    mimeType: "audio/opus",
                    clockRate: 48000,
                    channels: 2
                },
                {
                    kind: "video",
                    mimeType: "video/VP8",
                    clockRate: 90000,
                    parameters: {
                        'x-google-start-bitrate': 1000
                    }
                }
            ]
        },
        webRTCTransport: {
            listenIps: [
                {
                    ip: '0.0.0.0',
                    announcedIp: "172.16.150.238",
                }
            ],
            maxIncomingBitrate: 1500000,
            initialAvailableOutgoingBitrate: 1000000,
        }
    }
};
