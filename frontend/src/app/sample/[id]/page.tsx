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

interface ProducerContainer {
  producer_id: string;
  userId: string;
}

interface Peer {
  id: string;
  name: string;
}

type ConsumerEntry = {
  consumer : Consumer ; 
  userId : string ; 
}

interface RemoteStream {
  consumer: Consumer;
  stream: MediaStream;
  kind: MediaKind;
  producerId: string;
  userId : string;
}

export default function Page() {
  const roomId = useParams();
  const userId = useMemo(() => uuidv4(), []);
  console.log("the user id is" ,userId);
  //refs 
  const localStreamRef = useRef<HTMLVideoElement | null>(null); 
  const audioProducerRef = useRef<Producer | null>(null);
  const videoProducerRef = useRef<Producer | null>(null);
  const deviceRef = useRef<Device | null>(null);
  const consumerTransportRef = useRef<Transport | null>(null);
  const producerTransportRef = useRef<Transport | null> (null);
  const consumers = useRef<Map<string, ConsumerEntry>>(new Map());
  const consumedProducers = useRef<Set<string>>(new Set());

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
    const init = async () => {
      await loadEverything(); 
      await startStreaming();  
    };
  
    init();

    socket.onAny((event, args) => {
      routeIncommingEvents({ event, args });
    });

    const handleBeforeUnload = async(event : any) => {
      const response = await sendRequest(WebSocketEventType.EXIT_ROOM , {userId});
      console.log("this is the response" , response);
      event.preventDefault();
      event.returnValue = ''; 
    };
    
    
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      //cleanup
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };

  }, [roomId]);



  useEffect(() => {
   //consume all the producers 
    if (producers && producers.length > 0) {
      producers.forEach((producer) => {
        if (!consumedProducers.current.has(producer.producer_id)) {
          console.log("The producers are : " , producer);
          consume(producer.producer_id);
          consumedProducers.current.add(producer.producer_id);
        }
      });
    } 

  }, [roomId, producers]);

  

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

  const newProducers = (args: ProducerContainer[] | ProducerContainer) => {
    console.log("Received new producers:", args);
    
    // Handle both single object and array cases
    const producersArray = Array.isArray(args) ? args : [args];
    
    setProducers((v) => {
      // Make sure v is always an array
      const currentProducers = Array.isArray(v) ? v : [];
      return [...currentProducers, ...producersArray];
    });
  };
  
  const userLeft = (args: any) => {
    const leftUser = args.user as Peer;
    //leaving producerIds 
    const producerIds = args.leavingProducers ; 
  
    console.log("User who left:", leftUser , producerIds);
  
    // Remove that user from the room UI
    setUsersInRoom((v) => v.filter((peer) => peer.id !== leftUser.id));

    setRemoteStreams((streams) => {  
      const filtered = streams.filter(
        (stream) => !producerIds.includes(stream.producerId)
      );
      return filtered;
    });
    
    console.log("✅ Cleanup done for user:", leftUser.id);
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
    console.log("Consumer phase 1 cleared");
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
      console.log("Consumer transport created", data);

      if (!deviceRef.current) {
        console.log("No device found");
        return;
      }
      console.log("Consumer Phase 3");
      consumerTransportRef.current = deviceRef.current?.createRecvTransport(data.params);
      console.log("The consumer Transport Ref is " , consumerTransportRef.current.id);
      consumerTransportRef.current.on("connect", async ({ dtlsParameters }, cb, eb) => {
        sendRequest(WebSocketEventType.CONNECT_TRANSPORT, {
          userId : userId , 
          transportId: consumerTransportRef.current?.id,
          dtlsParameters,
        })
          .then(cb)
          .catch(eb);
      });
      console.log("Consumer Phase 4 ");

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
    console.log("In the get producers part");
    const {producerList} = (await sendRequest(
      WebSocketEventType.GET_PRODUCERS,
      {}
    )) as { producerList: ProducerContainer[]};

    if(!producerList){
      console.log("No producers to send found");
      return;
    }
    setProducers(producerList);

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
              userId : userId , 
              transportId: producerTransportRef.current!.id,
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
                producerTransportRef.current?.close();
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
    consumeProducers(producerId).then((data)=> {
      console.log("The producer Id inside consume is" , producerId);
      if(!data){
        console.log("Consumer not found!");
        return ;
      }
      const { consumer , kind } = data; 
      consumers.current.set(consumer.id , {consumer , userId});
      if (kind === "video" || kind === "audio") {
        setRemoteStreams((v) => [...v, data]);
      }
    })
  }
  console.log("The consumers are " , consumers.current);
  console.log("The remote streams are " , remoteStream);

  const consumeProducers = async(producerId : string) => {
    if(!deviceRef.current || !consumerTransportRef.current){
      console.log("incomplete refs in consume");
      return; 
    }
    console.log("The code is reaching here in the consumer part"); 
    const rtpCapabilities = deviceRef.current.rtpCapabilities; 
    console.log("the rttp ils " , rtpCapabilities);
    const data = await sendRequest(WebSocketEventType.CONSUME , {
      userId : userId , 
      rtpCapabilities ,
      consumerTransportId : consumerTransportRef.current.id , 
      producerId,
    });

    //s

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
    console.log("The stream is set" , consumer , stream , kind , producerId);
    return{
      userId : userId , 
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
    await createProducerTransport(); 
    await getProducers(); 
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
    <div className="min-h-screen bg-gray-100 p-4">
      <h1 className="text-2xl font-bold text-center mb-6">🎥 Video Calling App</h1>
  
      {/* Local Stream */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">👤 Local Stream</h2>
        <div className="border rounded-lg overflow-hidden w-full max-w-md mx-auto">
          <video ref={localStreamRef} autoPlay playsInline muted className="w-full h-auto bg-black" />
        </div>
      </section>
  
      {/* Remote Video Streams */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">📹 Remote Video Streams</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {remoteStream?.filter(({ kind }) => kind === "video").map(({ stream }, index) => (
            <div key={index} className="border rounded-lg overflow-hidden bg-white shadow">
              <video
                autoPlay
                playsInline
                className="w-full h-auto"
                muted
                ref={(videoElement) => {
                  if (videoElement) {
                    videoElement.srcObject = stream;
                  }
                }}
              />
            </div>
          ))}
        </div>
      </section>
  
      {/* Remote Audio Streams */}
      <section>
        {remoteStream?.filter(({ kind }) => kind === "audio").map(({ stream }, index) => (
          <div key={index} className="mb-2">
            <audio
              autoPlay
              ref={(audioElement) => {
                if (audioElement) {
                  audioElement.srcObject = stream;
                }
              }}
            />
          </div>
        ))}
      </section>
    </div>
  );
  
}