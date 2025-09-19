
import { RtpCodecCapability } from "mediasoup/types"

interface ListenIpsProps {
    ip : string , 
    announcedIp : string | undefined
}

export const config = {
    mediaSoup : {
        router : {
            mediaCodecs : [
                {
                    kind : "audio", 
                    mimeType : "audio/opus",
                    clockRate : 48000, 
                    channels : 2 
                } , 
                {
                    kind : "video",
                    mimeType : "video/VP8",
                    clockRate : 90000,
                    parameters : {
                        'x-google-start-bitrate' : 1000
                    }
                }
            ] as RtpCodecCapability[]
        }, 

        webRTCTransport : {
            listenIps: [
                {
                  ip: '0.0.0.0',
                  announcedIp: "192.168.98.72",
                }
              ] as ListenIpsProps[],
              maxIncomingBitrate: 1500000,
              initialAvailableOutgoingBitrate: 1000000,
        } 
    }
} 