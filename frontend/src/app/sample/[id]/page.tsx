"use client"
import { io } from "socket.io-client";
import { Device } from 'mediasoup-client';
import { useParams } from "next/navigation"
import { useMemo, useEffect, useState, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { RtpCapabilities } from "mediasoup-client/lib/RtpParameters";
import { WebSocketEventType } from "@/lib/types";
import {
  DtlsParameters,
  IceCandidate,
  IceParameters,
  MediaKind,
  RtpParameters,
  Transport
} from "mediasoup-client/lib/types";

//types and interfaces 
interface webRtcTransportParams {
  id: string;
  iceParameters: IceParameters;
  iceCandidates: IceCandidate[];
  dtlsParameters: DtlsParameters;
}

export default function Page() {
  const roomId = useParams();
  const userId = useMemo(() => uuidv4(), []);
  //refs 
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localAudioRef = useRef<HTMLAudioElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const deviceRef = useRef<Device | null>(null);
  const consumerTransportRef = useRef<Transport | null>(null)

  //states 
  const [rtpCapabilities, setRtpCapabilities] = useState<RtpCapabilities>();

  const socket = useMemo(
    () =>
      io(`${process.env.NEXT_PUBLIC_BACKEND_URL}`, {
        withCredentials: true,
      }),
    []
  );

  const sendRequest = (eventType: string, data: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      socket.emit(eventType, data, (response: any) => {
        if (response.error) {
          reject(new Error(response.error))
        } else {
          resolve(response)
        }
      })
    })
  }

  const joinRoom = async () => {
    const response = await sendRequest(WebSocketEventType.JOIN_ROOM, { userId, roomId: roomId.id, name: "tiru" });
    console.log(response);
    return response;
  }

  const getRtpCapabilities = async () => {
    const response = await sendRequest(WebSocketEventType.GET_ROUTER_RTP_CAPABILITIES, {});
    console.log(response);
    //create a device
    try {
      const device = new Device();
      deviceRef.current = device;
      await device.load({ routerRtpCapabilities: response.rtpCapabilities });
      console.log("Device loaded successfully");
    } catch (error) {
      console.log("Something went wrong in device", error);
    }
    return response;
  }

  const getCurrentUsers = async () => {
    const response = await sendRequest(WebSocketEventType.GET_IN_ROOM_USERS, {});
    console.log(response);
    return response;
  }

  const createAndConnectConsumerTransports = async () => {
    //create web rtc transport and then connect that 
    try {
      if (consumerTransportRef.current) {
        console.log("Already a consumer transport present");
        return;
      }

      const data = (await sendRequest(
        WebSocketEventType.CREATE_WEBRTC_TRANSPORT,
        { forceTcp: false }
      )) as { params: webRtcTransportParams };

      if (!data) {
        throw new Error("No Consumer Transport Created");
      }
      console.log(data);

      if (!deviceRef.current) {
        console.log("No device found");
        return;
      }
      consumerTransportRef.current = deviceRef.current?.createRecvTransport(data.params);

      consumerTransportRef.current.on("connect", async ({ dtlsParameters }, cb, eb) => {
        sendRequest(WebSocketEventType.CONNECT_TRANSPORT, {
          transport_id: consumerTransportRef.current!.id,
          dtlsParameters,
        })
          .then(cb)
          .catch(eb);
      });

      consumerTransportRef.current.on("connectionstatechange", (state) => {
        console.log("Consumer state", state);
        if (state === "connected") {
          console.log("--- Connected Consumer Transport ---");
        }
        if (state === "disconnected") {
          consumerTransportRef.current?.close();
        }
      });
      console.log("Consumer transport setup successfull"); 
    } catch (error) {
      console.log("Something went wrong while consumer transport", error);
    }

  }

  const loadEverything = async () => {
    await joinRoom();
    await getRtpCapabilities();
    await getCurrentUsers();
    await createAndConnectConsumerTransports(); 
  }

  useEffect(() => {
    //user joins a room , 
    // if there is not a room create the room 
    loadEverything();

  }, []);


  const handleStartCamera = async () => {
    if (!localVideoRef.current || !localAudioRef.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      // Set the video stream
      localVideoRef.current.srcObject = stream;
      await localVideoRef.current.play().catch(err => console.error("Error playing local video:", err));
      // Set the audio stream
      localAudioRef.current.srcObject = stream;
      await localAudioRef.current.play().catch(err => console.error("Error playing local audio:", err));
      console.log("Camera and microphone stream started");
      // If you have a separate ref for the stream
      localStreamRef.current = stream;

    } catch (error) {
      console.error("Error accessing media devices:", error);
    }
  };


  return (
    <>
      <div> hey this is my video calling application </div>
    </>
  )
}