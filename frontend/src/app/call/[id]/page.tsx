'use client'

import { io } from "socket.io-client";
import { Device } from 'mediasoup-client';
import { useParams } from "next/navigation"
import { useMemo, useEffect, useState, useRef } from "react";
import { Toaster, toast } from "sonner"
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { Phone, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { WebSocketEventType } from "@/lib/types";

import { types as mediasoupTypes } from "mediasoup-client";



//types and interfaces 
interface webRtcTransportParams {
  id: string;
  iceParameters: mediasoupTypes.IceParameters;
  iceCandidates: mediasoupTypes.IceCandidate[];
  dtlsParameters: mediasoupTypes.DtlsParameters;
}

interface ProducerContainer {
  producer_id: string;
  userId: string;
}

interface Peer {
  id: string;
  name: string;
}

interface UserDetails {
  userId: string,
  name: string
}

type ConsumerEntry = {
  consumer: mediasoupTypes.Consumer;
  userId: string;
}

interface RemoteStream {
  consumer: mediasoupTypes.Consumer;
  stream: MediaStream;
  kind: mediasoupTypes.MediaKind;
  producerId: string;
  userId: string;
}

export default function Page() {

  //params
  const roomId = useParams();

  //refs 

  const localStreamRef = useRef<HTMLVideoElement | null>(null);
  const audioProducerRef = useRef<mediasoupTypes.Producer | null>(null);
  const videoProducerRef = useRef<mediasoupTypes.Producer | null>(null);
  const deviceRef = useRef<Device | null>(null);
  const consumerTransportRef = useRef<mediasoupTypes.Transport | null>(null);
  const producerTransportRef = useRef<mediasoupTypes.Transport | null>(null);
  const consumers = useRef<Map<string, ConsumerEntry>>(new Map());
  const consumedProducers = useRef<Set<string>>(new Set());

  //states 
  const [userId, setUserId] = useState<string>();
  const [toastMessage, setToastMessage] = useState<string>();
  const [username, setUserName] = useState<string>();
  const [rtpCapabilities, setRtpCapabilities] = useState<mediasoupTypes.RtpCapabilities>();
  const [producers, setProducers] = useState<ProducerContainer[]>([]);
  const [isMicOn, setIsMicOn] = useState<boolean>(true);
  const [isVideoOn, setIsVideoOn] = useState<boolean>(true);
  const [usersInRoom, setUsersInRoom] = useState<Peer[]>([]);
  const [remoteStream, setRemoteStreams] = useState<RemoteStream[]>([]);
  const [pausedVideoProducerIds, setPausedVideoProducerIds] = useState<string[]>([]);


  const socket = useMemo(
    () =>
      io(`${process.env.NEXT_PUBLIC_BACKEND_URL}`, {
        withCredentials: true,
      }),
    []
  );

  //Auth guard variables
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log("Auth state changed:", { isAuthenticated, isLoading });

    if (!isLoading) {
      if (isAuthenticated && isAuthenticated === false) {
        toast.error("You are not logged in");
        router.push("/login");
      }
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    const storedUserId = localStorage.getItem("userId");
    const storedName = localStorage.getItem("name");
    if (!storedUserId || !storedName) {
      console.log("No stored user");
      return;
    }

    setUserId(storedUserId);
    setUserName(storedName);

  }, [])

  // console.log("the user id is", userId , username);
  useEffect(() => {
    if (isAuthenticated === false || isLoading || !username) {
      console.log("taking some time , ", isAuthenticated, isLoading);
      return;
    }
    //user joins a room , 
    const init = async () => {
      await loadEverything();
      await startStreaming();
    };

    init();

    socket.onAny((event, args) => {
      routeIncommingEvents({ event, args });
    });

    const handleBeforeUnload = async (event: any) => {
      const response = await sendRequest(WebSocketEventType.EXIT_ROOM, { userId });
      console.log("this is the response", response);
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      //cleanup
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [roomId, isAuthenticated]);



  useEffect(() => {
    //consume all the producers 
    if (producers && producers.length > 0) {
      producers.forEach((producer) => {
        if (!consumedProducers.current.has(producer.producer_id)) {
          console.log("The producers are : ", producer);
          consume(producer.producer_id);
          consumedProducers.current.add(producer.producer_id);
        }
      });
    }

  }, [roomId, producers]);


  useEffect(() => {

    //clean up producers while turning on mic and video; 
    console.log("coming into producer cleanup useeffect");
    const handleProducerCleanup = (producerId: string) => {
      setRemoteStreams(prev =>
        prev.filter(stream => stream.producerId !== producerId)
      );
    };

    socket.on("producer-cleanup", handleProducerCleanup);

    return () => {
      socket.off("producer-cleanup", handleProducerCleanup);
    }
  }, []);

  //getting the paused producers 
  useEffect(() => {

    const getPausedProducers = (pausedProducers: string[]) => {
      if (!pausedProducers) {
        console.log("No paused producers received");
      }
      console.log("UE PP :", pausedProducers);
      setPausedVideoProducerIds(pausedProducers);
    };

    socket.on(WebSocketEventType.GET_PAUSED_PRODUCERS, getPausedProducers);

    return () => {
      socket.off(WebSocketEventType.GET_PAUSED_PRODUCERS, getPausedProducers);
    }
  }, [socket])



  //send request template
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

  //router for socket.on events from the server
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
    const producerIds = args.leavingProducers;

    console.log("User who left:", leftUser, producerIds);
    toast(`${leftUser.name} left the call`);

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
  console.log("The users in room are ", usersInRoom);

  const userJoined = (args: any) => {
    const user = args.user as Peer;
    console.log("The user is joined , ", user);
    toast(`${user.name} has joined the call`)
    setUsersInRoom((v) => [...v, user]);
  };

  const joinRoom = async () => {
    const response = await sendRequest(WebSocketEventType.JOIN_ROOM, { userId, roomId: roomId.id, name: username });
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
    console.log("The current users are response: ", response);
    const { users } = response;
    setUsersInRoom(users)
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
        { forceTcp: false, userId: userId }
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
      console.log("The consumer Transport Ref is ", consumerTransportRef.current.id);
      consumerTransportRef.current.on("connect", async ({ dtlsParameters }, cb, eb) => {
        sendRequest(WebSocketEventType.CONNECT_TRANSPORT, {
          userId: userId,
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

  console.log("the producers state are", producers);

  const getProducers = async () => {
    console.log("In the get producers part");
    const { producerList } = (await sendRequest(
      WebSocketEventType.GET_PRODUCERS,
      {}
    )) as { producerList: ProducerContainer[] };

    if (!producerList) {
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
          userId: userId,
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
              userId: userId,
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
                    userId: userId,
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
                producerTransportRef.current?.close();
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

  const consume = async (producerId: string) => {
    consumeProducers(producerId).then((data) => {
      console.log("The producer Id inside consume is", producerId);
      if (!data) {
        console.log("Consumer not found!");
        return;
      }
      const { consumer, kind } = data;
      if (!userId) {
        return;
      }
      consumers.current.set(consumer.id, { consumer, userId });
      if (kind === "video" || kind === "audio") {
        setRemoteStreams((v) => [
          ...v,
          { ...data, userId: userId! }, // non-null assertion
        ]);
      }
    })
  }
  console.log("The consumers are ", consumers.current);
  console.log("The remote streams are ", remoteStream);

  const consumeProducers = async (producerId: string) => {
    if (!deviceRef.current || !consumerTransportRef.current) {
      console.log("incomplete refs in consume");
      return;
    }
    console.log("The code is reaching here in the consumer part");
    const rtpCapabilities = deviceRef.current.rtpCapabilities;
    console.log("the rttp ils ", rtpCapabilities);
    const data = await sendRequest(WebSocketEventType.CONSUME, {
      userId: userId,
      rtpCapabilities,
      consumerTransportId: consumerTransportRef.current.id,
      producerId,
    });

    //s

    console.log("The data is ", data);

    const { id, kind, rtpParameters } = data;
    console.log("Comsumer_Data", data);

    const consumer = await consumerTransportRef.current.consume({
      id,
      producerId,
      kind,
      rtpParameters
    });
    console.log('the consumer is', consumer);
    const stream = new MediaStream();
    stream.addTrack(consumer.track);
    console.log("The stream is set", consumer, stream, kind, producerId);
    return {
      userId: userId,
      consumer,
      stream,
      kind,
      producerId
    }
  }


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

  const turnMicOn = async () => {
    if (!isMicOn) {
      // Turn ON
      console.log("Mic triggered")
      if (audioProducerRef.current) {
        audioProducerRef.current.resume();
      }
      setIsMicOn(true);
    } else {
      // Turn OFF
      if (audioProducerRef.current) {
        audioProducerRef.current.pause();
      }
      setIsMicOn(false);
    }
  };

  // console.log("video on state", isVideoOn);
  // console.log("audio on state", isMicOn);
  // console.log("paused Producers" , pausedVideoProducerIds);

  const turnVideoOn = async () => {
    if (!isVideoOn) {
      // TURN ON
      try {
        if (videoProducerRef.current) {
          const videoProducerId = videoProducerRef.current.id;
          videoProducerRef.current.resume();

          const response = await sendRequest(WebSocketEventType.REMOVE_PAUSED_PRODUCER, { videoProducerId });
          if (response.error) {
            console.error("Error removing paused producer:", response.error);
          }
        }
        setIsVideoOn(true);
      } catch (error) {
        console.log("Video error:", error);
      }
    } else {
      // TURN OFF
      try {
        if (videoProducerRef.current) {
          const videoProducerId = videoProducerRef.current.id;
          videoProducerRef.current.pause();

          const response = await sendRequest(WebSocketEventType.ADD_PAUSED_PRODUCER, { videoProducerId });
          if (response.error) {
            console.error("Error adding paused producer:", response.error);
          }
        }
        setIsVideoOn(false);
      } catch (error) {
        console.log("Video pause error:", error);
      }
    }
  };

  const getUserNameByProducerId = (producerId: string): string => {
    console.log("The producerId is", producerId);
    const producer = producers.find(p => p.producer_id === producerId);
    const user = usersInRoom.find(u => u.id === producer?.userId);
    console.log("username is", user?.name, user);
    return user?.name || "Unknown";
  };



  return (
    <>
      <Toaster position="bottom-left" richColors />
      <div className="bg-gradient-to-br from-zinc-900 via-black to-zinc-800 min-h-screen relative p-6">
        <h1 className="text-3xl font-semibold text-center mb-8 text-white tracking-wide">
          🎥 Video Calling App
        </h1>

        {/* Hidden audio element */}


        {/* Local Stream */}
        <section className="fixed bottom-6 right-6 z-50">
          <div className="w-60 rounded-xl overflow-hidden shadow-xl backdrop-blur bg-white/5 border border-white/10 relative">
            <video
              autoPlay
              muted
              playsInline
              ref={localStreamRef}
              className="w-full h-full object-contain"
            />
            {!isVideoOn && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-gray-700 text-white flex items-center justify-center text-4xl font-semibold">
                  {username?.[0]?.toUpperCase() || "?"}
                </div>
              </div>
            )}

            {/* Controls */}
            {!isMicOn && (<div className="absolute top-2 right-2 text-white">
              <MicOff></MicOff>
            </div>)}

            <div className="absolute bottom-2 left-2 text-white bg-black/50 px-2 rounded-sm ">
              {username} (You)
            </div>
          </div>
        </section>

        <div
          className={`
    w-full gap-6 px-2 md:px-6 pb-20
    ${remoteStream.length === 2 ? "grid grid-cols-1" : ""}
    ${remoteStream.length === 4 ? "flex flex-col md:flex-row" : ""}
    ${remoteStream.length === 6 ? "flex flex-wrap justify-center" : ""}
    ${remoteStream.length > 6 ? "grid grid-cols-2 md:grid-cols-2" : ""}
  `}
          style={{ height: "100vh", overflow: "auto" }}
        >
          {remoteStream.length === 0 ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-white text-xl bg-black/50 rounded-xl space-y-4">
              {/* Pulsing dot */}

              {/* Ringing text animation */}
              <div className="flex items-center space-x-1 font-semibold text-2xl">
                <span>Ringing</span>
                <span className="animate-bounce [animation-delay:0s]">.</span>
                <span className="animate-bounce [animation-delay:0.2s]">.</span>
                < span className="animate-bounce [animation-delay:0.4s]">.</span>
              </div>
            </div>

          ) : (
            remoteStream
              .filter(({ kind }) => kind === "video")
              .map(({ stream, producerId }, index) => {
                const userName = getUserNameByProducerId(producerId);
                const userInitial = userName?.[0]?.toUpperCase() || "?";
                return (
                  <div
                    key={index}
                    className="relative rounded-xl overflow-hidden bg-white/5 backdrop-blur shadow-lg border border-white/10"
                    style={{
                      maxWidth:
                        remoteStream.length === 2
                          ? "100%"
                          : remoteStream.length === 4
                            ? "48%"
                            : remoteStream.length === 6
                              ? "30%"
                              : "100%",
                    }}
                  >
                    {!pausedVideoProducerIds.includes(producerId) ? (
                      <video
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-contain aspect-video"
                        ref={(videoElement) => {
                          if (videoElement) {
                            videoElement.srcObject = stream;
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full h-full aspect-video flex flex-col items-center justify-center bg-black text-white">
                        <div className="w-24 h-24 flex items-center justify-center rounded-full bg-gray-700 mb-2 text-4xl font-semibold">
                          {userInitial}
                        </div>
                      </div>
                    )}

                    <div className="absolute bottom-2 left-2 md:text-lg bg-black/60 text-white text-sm px-2 py-1 rounded-md">
                      {userName}
                    </div>
                  </div>
                );
              })
          )}
        </div>

        {/* Sticky End Call Button */}
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 flex gap-4 bg-black/70 p-4 rounded-full shadow-lg backdrop-blur-md border border-white/10">
          {/* Mic Toggle */}
          <button
            onClick={turnMicOn}
            className={`transition-all duration-300 ease-in-out hover:-translate-y-1 p-3 rounded-full ${isMicOn ? "bg-white text-black hover:bg-gray-200" : "bg-gray-800 text-white hover:bg-gray-700"
              }`}
            title="Toggle Mic"
          >
            {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
          </button>

          {/* End Call */}
          <button
            // onClick={handleEndCall}
            className="bg-red-600 hover:bg-red-700 text-white p-3 rounded-full transition-all duration-300 hover:-translate-y-1 ease-in-out"
            title="End Call"
          >
            <Phone size={20} />
          </button>

          {/* Video Toggle */}
          <button
            onClick={turnVideoOn}
            className={`transition-all duration-300 ease-in-out p-3 hover:-translate-y-1  rounded-full ${isVideoOn ? "bg-white text-black hover:bg-gray-200" : "bg-gray-800 text-white hover:bg-gray-700"
              }`}
            title="Toggle Video"
          >
            {isVideoOn ? <Video size={20} /> : <VideoOff size={20} />}
          </button>

        </div>




        {/* Remote Audio Streams */}
        <section>
          {remoteStream
            ?.filter(({ kind }) => kind === "audio")
            .map(({ stream }, index) => (
              <div key={index} className="hidden">
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
    </>
  );


}