"use client"
import { io } from "socket.io-client";
import { Device } from 'mediasoup-client';
import { useParams } from "next/navigation"
import { useMemo, useEffect, useState, useRef} from "react";
import { v4 as uuidv4 } from "uuid";
import { RtpCapabilities } from "mediasoup-client/lib/RtpParameters";
import { WebSocketEventType } from "@/lib/types";
import {
  DtlsParameters,
  IceCandidate,
  IceParameters,
  MediaKind,
  Producer,
  RtpParameters,
  Transport ,
  Consumer
} from "mediasoup-client/lib/types";

//types and interfaces 
interface webRtcTransportParams {
  id: string;
  iceParameters: IceParameters;
  iceCandidates: IceCandidate[];
  dtlsParameters: DtlsParameters;
}

export interface ProducerContainer {
  producer_id: string;
  userId: string;
}

export interface Peer {
  id: string;
  name: string;
}

export interface RemoteStream {
  consumer: Consumer;
  stream: MediaStream;
  kind: MediaKind;
  producerId: string;
}

export default function Page() {
  const roomId = useParams();
  const userId = useMemo(() => uuidv4(), []);
  //refs 
  const localStreamRef = useRef<HTMLVideoElement | null>(null); 
  const audioProducerRef = useRef<Producer | null>(null);
  const videoProducerRef = useRef<Producer | null>(null);
  const deviceRef = useRef<Device | null>(null);
  const consumerTransportRef = useRef<Transport | null>(null);
  const producerTransportRef = useRef<Transport | null> (null);
  const consumers = useRef<Map<string, Consumer>>(new Map());

  //states 
  const [rtpCapabilities, setRtpCapabilities] = useState<RtpCapabilities>();
  const [producers , setProducers] = useState<ProducerContainer[]>([]); 
  const[isMicOn , setIsMicOn] = useState<boolean>(false); 
  const [usersInRoom, setUsersInRoom] = useState<Peer[]>([]);
  const[remoteStream , setRemoteStreams] = useState<RemoteStream[]>([]); 

  const socket = useMemo(
    () =>
      io(`${process.env.NEXT_PUBLIC_BACKEND_URL}`, {
        withCredentials: true,
      }),
    []
  );

  useEffect(() => {
    //user joins a room , 
    // if there is not a room create the room 
    const init = async () => {
      await loadEverything();  // Setup transports, join room, etc.
      await startStreaming();  // Now start producing (which triggers the "produce" listener)
    };
  
    init();

    socket.onAny((event, args) => {
      routeIncommingEvents({ event, args });
    });

    const handleBeforeUnload = () => {
      // Sync-safe cleanup
      console.log("In the handle unload part");
      socket.disconnect();
    };
    
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      // Proper async cleanup
      sendRequest(WebSocketEventType.EXIT_ROOM, {}).finally(() => {
        socket.disconnect();
      });
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };

  }, [roomId]);

  useEffect(() => {
    producers.forEach((producer) => {
      consume(producer.producer_id);
    });
  }, []);

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

  const routeIncommingEvents = ({
    event,
    args,
  }: {
    event: WebSocketEventType;
    args: any;
  }) => {
    switch (event) {
      case WebSocketEventType.USER_JOINED:
        userJoined(args);
        break;

      case WebSocketEventType.USER_LEFT:
        userLeft(args);
        break;

      case WebSocketEventType.NEW_PRODUCERS:
        newProducers(args);
        break;

      case WebSocketEventType.PRODUCER_CLOSED:
        closedProducers(args);
        break;

      default:
        break;
    }
  };

  const closedProducers = (args: ProducerContainer) => {
    setProducers((v) =>
      v.filter((prod) => prod.producer_id !== args.producer_id)
    );
  };

  const closeProducer = (producer_id: string) => {
    sendRequest(WebSocketEventType.CLOSE_PRODUCER, { producer_id });
  };

  const newProducers = (args: ProducerContainer[]) => {
    console.log(args);

    setProducers((v) => [...v, ...args]);
  };

  const userLeft = (args: any) => {
    console.log("USER LEFT ARS", args);

    const user = args.user as Peer;
    setUsersInRoom((v) => v.filter((peer) => peer.id !== user.id));
  };
  const userJoined = (args: any) => {
    const user = args.user as Peer;
    setUsersInRoom((v) => [...v, user]);
  };

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
        { forceTcp: false , userId : userId }
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

  console.log("the producers state are" , producers);

  const getProducers = async () => {
    const producersToSend = (await sendRequest(
      WebSocketEventType.GET_PRODUCERS,
      {}
    )) as ProducerContainer[];
    console.log("the producers to send are" , producersToSend); 
    setProducers(producersToSend);
  };

  const createProducerTransport = async () => {
    if (deviceRef.current) {
      console.log("resp");

      const resp = (await sendRequest(
        WebSocketEventType.CREATE_WEBRTC_TRANSPORT,
        {
          forceTcp: false,
          userId : userId , 
          rtpCapabilities: deviceRef.current.rtpCapabilities,
        }
      )) as { params: webRtcTransportParams };
      console.log(resp);

      producerTransportRef.current = deviceRef.current.createSendTransport(resp.params);

      console.log("--- CREATE PRODUCER TRANSPORT ---");

      if (producerTransportRef.current) {
        try {
          producerTransportRef.current.on("connect", ({ dtlsParameters }, cb, eb) => {
            sendRequest(WebSocketEventType.CONNECT_TRANSPORT, {
              transport_id: producerTransportRef.current!.id,
              dtlsParameters,
            })
              .then(cb)
              .catch(eb);
          });


          producerTransportRef.current.on(
            "produce",
            async ({ kind, rtpParameters }, cb, eb) => {
              try {
                const { producer_id } = (await sendRequest(
                  WebSocketEventType.PRODUCE,
                  {
                    userId : userId, 
                    producerTransportId: producerTransportRef.current!.id,
                    kind,
                    rtpParameters,
                  }
                )) as { producer_id: string };

                console.log(producer_id);

                cb({ id: producer_id });
              } catch (error) {
                console.log(error);

                eb(new Error(String(error)));
              }
            }
          );

          producerTransportRef.current.on("connectionstatechange", (state) => {
            console.log(state);
            switch (state) {
              case "disconnected":
                console.log("Producer disconnected");
                break;
            }
          });

        
          return true;
        } catch (error) {
          console.log("Producer Creation error :: ", error);
        }
      }
    }
  };

  const consume = async (producerId : string) => {
    console.log("the code is reaching here ");
    consumeProducers(producerId).then((data)=> {
      if(!data){
        console.log("Consumer not found!");
        return ;
      }
      const { consumer , kind } = data; 
      consumers.current.set(consumer.id , consumer);
      if (kind === "video" || kind === "audio") {
        setRemoteStreams((v) => [...v, data]);
      }
    })
  }

  const consumeProducers = async(producerId : string) => {
    if(!deviceRef.current || !consumerTransportRef.current){
      console.log("incomplete refs in consume");
      return; 
    }
    console.log("The code is reaching here in the consumer part"); 
    const rtpCapabilities = deviceRef.current.rtpCapabilities; 

    const data = await sendRequest(WebSocketEventType.CONSUME , {
      userId : userId , 
      rtpCapabilities ,
      consumerTransportId : consumerTransportRef.current.id , 
      producerId,
    });

    console.log("The data is " , data);

    const { id , kind , rtpParameters } = data ; 
    console.log("Comsumer_Data" , data);

    const consumer = await consumerTransportRef.current.consume({
      id , 
      producerId,
      kind, 
      rtpParameters
    });
    console.log('the consumer is' , consumer); 
    const stream =  new MediaStream(); 
    stream.addTrack(consumer.track);

    return{
      consumer , 
      stream , 
      kind , 
      producerId 
    }
  }

  //write a logic for consumer 
  // write a logic to consume all the producers 
  // write a logic to detect new producers and consumer it 
  // write a logic to close the producers 

  const loadEverything = async () => {
    await joinRoom();
    await getRtpCapabilities();
    await getCurrentUsers();
    await createAndConnectConsumerTransports(); 
    await getProducers(); 
    await createProducerTransport(); 
  }


  const startStreaming = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
  
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
  
      // Store the local stream if needed (for preview)
      if (localStreamRef.current) {
        localStreamRef.current.srcObject = stream;
      }
  
      if (producerTransportRef.current) {
        // Produce video
        const videoProducer = await producerTransportRef.current.produce({
          track: videoTrack,
        });
  
        // Produce audio
        const audioProducer = await producerTransportRef.current.produce({
          track: audioTrack,
        });
  
        // Optionally store both producers
        videoProducerRef.current = videoProducer;
        audioProducerRef.current = audioProducer;
      }
    } catch (err) {
      console.error("Error starting stream:", err);
    }
  };
  


  return (
    <>
    <div>Hey, this is my video calling application</div>

    <div>
      <h2>Local Stream</h2>
      <video ref={localStreamRef} autoPlay playsInline muted />
    </div>

    <h2>People are</h2>
    {remoteStream.map(({ stream, kind }, index) => (
      <div key={index}>
        <h3>{kind} Stream</h3>
        <video
          autoPlay
          playsInline
          ref={(videoElement) => {
            if (videoElement) {
              videoElement.srcObject = stream;
            }
          }}
        />
      </div>
    ))}
  </>
  )
}