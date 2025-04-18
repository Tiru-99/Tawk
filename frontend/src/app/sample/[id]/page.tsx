"use client"

import { Device } from "mediasoup-client";
import { Transport } from "mediasoup-client/lib/types";
import { RtpCapabilities } from "mediasoup-client/lib/RtpParameters";
import { io } from 'socket.io-client';
import { useEffect, useState, useMemo, useRef} from 'react';
import { useParams } from "next/navigation";


type ProducerResponse = {
  id: string;
  producerSocketId: string;
};

interface ProducerInfo  {
  id : string , 
  kind : string
}

interface TransportParams {
  id: string;
  iceParameters: any; // Replace 'any' with the actual type if available
  iceCandidates: any[]; // Replace 'any' with the actual type if available
  dtlsParameters: any; // Replace 'any' with the actual type if available
}


export default function Home() {

  const socket = useMemo(
    () =>
      io(`${process.env.NEXT_PUBLIC_BACKEND_URL}`, {
        withCredentials: true,
      }),
    []
  );

  const { id } = useParams();
  const deviceRef = useRef<Device | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement }>({});
  const [rtpCapabilities, setRtpCapabilities] = useState<RtpCapabilities>();
  const [consumers, setConsumers] = useState<{ id: string; stream: MediaStream ; kind : string}[]>([]);
  const [producers, setProducers] = useState<ProducerInfo[]>([]);
  const [userProducer, setUserProducer] = useState<string[]>([]);
  const [fetchProducers, setFetchProducers] = useState<number>(0);
  const [triggerConsumeMedia, setTriggerConsumeMedia] = useState<number>(0);
  const consumerTransportRef = useRef<Transport | null>(null);


  useEffect(() => {
    socket.on("newProducer", ({producerId , kind}) => {
      console.log("the producer kind is " ,kind);
      console.log("new producer joined and event triggered", producerId);
      consumeMediaForSingleProdcuer(producerId , kind);
    });

    return () => {
      socket.off("newProducer");
    }
  }, []);

  useEffect(() => {
    socket.emit("getProducers", { id }, (producerInfo: ProducerInfo[]) => {
      console.log("Producer IDs received", producerInfo);
      setProducers(producerInfo); // Asynchronously updates state
      //consumeMedia function here 
      consumeMedia(producerInfo);
    });
  }, [fetchProducers]);

// Dynamically assign streams to video elements
useEffect(() => {
  console.log("The code is reaching in the consumer useEffect part");
  consumers.forEach(({ id, stream, kind }) => {
    const videoEl = document.getElementById(`video-${id}`) as HTMLVideoElement;
    if (videoEl && !videoEl.srcObject) {
      videoEl.srcObject = stream;
      videoEl.play().catch((err) => console.error(`Error playing ${kind} video ${id}:`, err));
    }
  });
}, [consumers]);
  


  // useEffect(() => {
  //   if (producers && producers.length > 0) {
  //     // Filter out producers that have already been consumed
  //     const newProducers = producers.filter((producerId) => !consumers.some((consumer) => consumer.id === producerId));
  //     if (newProducers.length > 0) {
  //       consumeMedia(newProducers);
  //     }
  //   }
  // }, [consumers , producers]);

  useEffect(() => {
    //creating a room 
    socket.emit("join-meet", id, (response: { success: boolean, error?: string }) => {
      if (!response.success) {
        console.error("Error joining meet:", response.error);
        return;
      }

      socket.emit("getRouterRtpCapabilities", {}, async (capabilities: RtpCapabilities) => {
        console.log("RTP capabilities received", capabilities)
        setRtpCapabilities(capabilities);

        //load a device here
        const device = new Device();
        console.log("The device 1 is", device);
        deviceRef.current = device;
        try {
          await device.load({ routerRtpCapabilities: capabilities });
          console.log("Mediasoup device successfully initiated");
        } catch (err) {
          console.error(" Error loading Mediasoup device", err);
          return;
        }
      });
      // create consumer transport  
      // connect consumer transport

      handleStartCamera().then(() => {
        produceMedia();
      })

    });
    //get rtp capabilities from the server 


    return () => {
      socket.emit("disconnect")
    }

  }, [socket]);


  const produceMedia = async () => {
    try {
      socket.emit("createProducerTransport", {}, async (params: any) => {
        console.log("params for producer transport received", params);
        if (!params || !deviceRef.current) return null;

        const producerTransport = deviceRef.current.createSendTransport(params);

        const { socketId } = params;


        // Handle connection event
        producerTransport.on("connect", async ({ dtlsParameters }, callback) => {
          try {
            console.log("The code is reaching in the producer connect part");
            socket.emit("connectProducerTransport", { dtlsParameters, socketId });
            console.log("Producer connected successfully");
            callback();
          } catch (error) {
            console.log("Something went wrong while connection producer transport", error);
          }
        });

        producerTransport.on("produce", async ({ kind, rtpParameters }: any, callback: (data: ProducerResponse) => void) => {
          try {
            socket.emit(
              "produce",
              { kind, rtpParameters },
              ({ id, producerSocketId }: { id: string; producerSocketId: string }) => {
                const response: ProducerResponse = { id, producerSocketId };

                console.log("Producer Response:", response); // Logs the correct structure
                console.log("Producer ID:", response.id); // Accessing the correct `id`
                setUserProducer((prev) => [...prev, response.id]);
                callback(response); // Passing the correct object

                setFetchProducers((prev) => prev + 1);
                setTriggerConsumeMedia((prev) => prev + 1);
              }
            );
          } catch (error) {
            console.error("Something went wrong while producing", error);
          }
        }
        );


        // THIS IS WHAT WAS MISSING - Actually produce media after setting up the transport
        if (localStreamRef.current) {
          try {
            for (const track of localStreamRef.current.getTracks()) {
              console.log("Producing track:", track.kind);
              const producer = await producerTransport.produce({ track });
              console.log("Producer created:", producer.id);
            }
          } catch (error) {
            console.error("Error producing media:", error);
          }
        } else {
          console.error("No local stream available to produce");
        }
      });
    } catch (error) {
      console.error("Something went wrong while initiating the  producer");
    }
  }


  const consumeMediaForSingleProdcuer = async (producerId: string ,kind : string) => {

    if (!producerId) {
      console.log("No incoming producers to consume");
      return;
    }

    const exists = userProducer.some((producer) => producer === producerId);
    if (exists) {
      return;
    }

    socket.emit("createConsumerTransport", {kind}, async (params: any) => {
      if (!params || !deviceRef.current) return;

      console.log("The params are", params);

      const consumerTransport = deviceRef.current.createRecvTransport(params)
      console.log("Consumer Transport methods:", consumerTransport.connectionState);
      consumerTransportRef.current = consumerTransport;

      const { socketId } = params;
      console.log("📢 Registering consumer transport event listeners...");
      consumerTransport.on("connect", async ({ dtlsParameters }, callback, errback) => {
        try {
          socket.emit("connectConsumerTransport", { dtlsParameters, socketId , kind}, () => {
            console.log("Consumer transport connected successfully!");
          });
          callback();
          console.log("Consumer created successfully");
          // consumeAllProducers(params);
        } catch (error) {
          console.error("Error connecting consumer transport", error);
        }
      });


      socket.emit(
        "consume",
        {
          producerId, // The socket ID of the producer whose media we want to consume
          rtpCapabilities: deviceRef.current?.rtpCapabilities,
          kind // The Mediasoup device's RTP capabilities
        },
        async (data: any) => {
          console.log("The code is reacheing here in the cosumer section")
          console.log("The data from the backend is", data);
          if (data.error) {
            console.error("Error consuming:", data.error);
            return;
          }

          const consumer = await consumerTransport.consume({
            id: data.id,
            producerId: data.producerId,
            kind: data.kind,
            rtpParameters: data.rtpParameters,
          });

          socket.emit("consumer-resume", { consumerId: data.id });

          console.log("Consumer created successfully:", consumer);

          // Create a new media stream and store it
          // Create a new media stream and store it
          try {
            const newStream = new MediaStream([consumer.track]);
            setConsumers((prevConsumers) => [
              ...prevConsumers,
              { id: consumer.id, stream: newStream ,kind : consumer.kind },
            ]);
          } catch (error) {
            console.error("Error creating MediaStream:", error);
          }
        }
      );

    });
  }


  const consumeMedia = async (producerInfo: ProducerInfo[]) => {
    if (!producerInfo || !Array.isArray(producerInfo) || producerInfo.length === 0) {
      console.warn("⚠️ No producers available to consume.");
      return;
    }
    //to filter your own producerId
    const filteredProducers = producerInfo.filter(
      (producer) => !userProducer.includes(producer.id)
    );

    if (filteredProducers.length === 0) {
      console.log("No external producers to consume.");
      return;
    }
  
    for (const producer of filteredProducers) {
      const { id: producerId, kind } = producer;
  
      socket.emit("createConsumerTransport", { kind }, async (params: any) => {
        if (!params || !deviceRef.current) return;
  
        console.log("The params are", params);
  
        const consumerTransport = deviceRef.current.createRecvTransport(params);
        console.log("Consumer Transport created:", consumerTransport.id);
  
        const { socketId } = params;
  
        consumerTransport.on("connect", async ({ dtlsParameters }, callback, errback) => {
          try {
            socket.emit("connectConsumerTransport", { dtlsParameters, socketId, kind }, () => {
              console.log("✅ Consumer transport connected!");
            });
            callback();
          } catch (error) {
            console.error("❌ Error connecting consumer transport", error);
          }
        });
  
        socket.emit(
          "consume",
          {
            producerId,
            rtpCapabilities: deviceRef.current?.rtpCapabilities,
            kind,
          },
          async (data: any) => {
            if (data.error) {
              console.error("Error consuming:", data.error);
              return;
            }
  
            const consumer = await consumerTransport.consume({
              id: data.id,
              producerId: data.producerId,
              kind: data.kind,
              rtpParameters: data.rtpParameters,
            });
  
            socket.emit("consumer-resume", { consumerId: data.id });
  
            console.log("🎥 Consumer created successfully:", consumer);
  
            try {
              const newStream = new MediaStream([consumer.track]);
              setConsumers((prev) => [
                ...prev,
                { id: consumer.id, stream: newStream, kind: consumer.kind },
              ]);
            } catch (err) {
              console.error("Error creating MediaStream:", err);
            }
          }
        );
      });
    }
  };
  

  const handleStartCamera = async () => {
    if (!localVideoRef.current) return null;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localVideoRef.current.srcObject = stream;
      console.log("The code is coming into handle start camera");
      localVideoRef.current.play().catch(err => console.error("Error playing local video:", err));
      localStreamRef.current = stream;
    } catch (error) {
      console.error("Error accessing media devices:", error);
    }
  };

  console.log("The consumers are ", consumers)


  return (
    <div>
      <h1>Welcome to the tiru meet application</h1>
      <div>
        <video ref={localVideoRef} autoPlay playsInline muted></video>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {consumers
          .filter(({ kind }) => kind === "video") // Only include video streams
          .map(({ id, stream }) => (
            <video
              key={id}
              ref={(el) => {
                if (el && stream) {
                  el.srcObject = stream;
                  el.autoplay = true;
                  el.playsInline = true;
                }
              }}
              className="w-full h-auto rounded-lg shadow-md"
            />
          ))}
      </div>

    </div>
  );

}