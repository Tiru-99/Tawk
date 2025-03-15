"use client"

import { useState , useEffect , useRef} from 'react';
import { io } from 'socket.io-client';
import { Device } from 'mediasoup-client';
import { start } from 'repl';


export default function Home(){
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const remoteVideRef = useRef<HTMLVideoElement | null>(null);

    const [params, setParams] = useState({
        encoding: [
          { rid: "r0", maxBitrate: 100000, scalabilityMode: "S1T3" }, // Lowest quality layer
          { rid: "r1", maxBitrate: 300000, scalabilityMode: "S1T3" }, // Middle quality layer
          { rid: "r2", maxBitrate: 900000, scalabilityMode: "S1T3" }, // Highest quality layer
        ],
        codecOptions: { videoGoogleStartBitrate: 1000 }, // Initial bitrate
      });

      const [device, setDevice] = useState<any>(null); // mediasoup Device
      const [socket, setSocket] = useState<any>(null); // Socket for signaling
      const [rtpCapabilities, setRtpCapabilities] = useState<any>(null); // RTP Capabilities for the device
      const [producerTransport, setProducerTransport] = useState<any>(null); // Transport for sending media
      const [consumerTransport, setConsumerTransport] = useState<any>(null); // Transport for receiving media


      useEffect(()=>{
        const socket =  io(`${process.env.NEXT_PUBLIC_BACKEND_URL}`, {  
            withCredentials: true,
          });

          setSocket(socket);

          socket.on("connection-success" ,(data)=> {
            startCamera(); 
          });

          return ()=>{
            socket.disconnect()
          }
      },[]);

      const startCamera = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          if (videoRef.current) {
            const track = stream.getVideoTracks()[0];
            videoRef.current.srcObject = stream;
            setParams((current) => ({ ...current, track }));
          }
        } catch (error) {
          console.error("Error accessing camera:", error);
        }
      };
    
}