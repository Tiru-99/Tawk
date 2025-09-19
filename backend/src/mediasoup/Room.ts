import Peer from "./Peer";
import * as io from "socket.io";
import { Router } from "mediasoup/types";
import { DtlsParameters, RtpParameters, Worker , MediaKind , RtpCapabilities } from "mediasoup/types";
import { config } from "../utils/config";
import { WebSocketEventType } from "./enums";

export default class Room {
    id : string ; 
    _peers : Map<string , Peer>;
    io : io.Server
    private _router : Router | null = null ;
    private _pausedVideoProducerIds: string[] = [];

    constructor(id : string , io : io.Server ,  worker : Worker){
        this.id = id ; 
        this._peers = new Map<string , Peer>; 
        this.io = io ; 
        const mediaCodecs = config.mediaSoup.router.mediaCodecs; 
        worker.createRouter({mediaCodecs}).then((router)=>{
            this._router = router; 
        })
    }

    public createPeer(name : string , userId : string){
        if(this._peers.has(userId)){
            return ;
        }
        this._peers.set(userId, new Peer(userId , name ));
        return this._peers.get(userId); 
    }

    public removePeer(userId: string) {
        const peer = this._peers.get(userId);
        if (!peer) {
          return;
        }
        this._peers.delete(userId);
        return peer;
    }

    public getCurrentPeers(userId : string){
        const peers : {id : string , name : string}[] = [];
        Array.from(this._peers.keys())
            .filter((key)=> key !== userId)
            .forEach((peerId)=> {
                if(this._peers.has(peerId)){
                    const { id , name } = this._peers.get(peerId)!; 
                    peers.push({id  , name});
                }
            })

            return peers; 
    }

    public async createWebRtcTransport(userId: string) {
        const { maxIncomingBitrate, initialAvailableOutgoingBitrate } =
          config.mediaSoup.webRTCTransport
    
        const transport = await this._router?.createWebRtcTransport({
          listenIps: config.mediaSoup.webRTCTransport.listenIps,
          enableUdp: true,
          enableTcp: true,
          preferUdp: true,
          initialAvailableOutgoingBitrate,
        })!;
    
        if (maxIncomingBitrate) {
          try {
            await transport.setMaxIncomingBitrate(maxIncomingBitrate);
          } catch (error) {}
        }
    
        transport.on("dtlsstatechange", (dtlsState) => {
          if (dtlsState === "closed") {
            console.log("Transport close", {
              name: this._peers.get(userId)?.name,
            });
            transport.close();
          }
        });
    
        transport.on("@close", () => {
          console.log("Transport close", { name: this._peers.get(userId)?.name });
        });
    
        console.log("Adding transport", { transportId: transport.id });
        const peer = this._peers.get(userId);
        if (!peer) {
          console.error("Peer not found for userId:", userId);
          return;
        }
        peer.addTransport(transport);
    
        return {
          params: {
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters,
          },
        };
    }

    public async connectPeerTransport(
        userId : string , 
        transportId : string , 
        dtlsParameters : DtlsParameters
    ){
        const peer = this._peers.get(userId); 
        if(!peer){
            console.log("No peer found with this id")
        }

        await peer?.connectTransport(transportId , dtlsParameters); 
    }

    public getRtpCapabilities(){
        return this._router?.rtpCapabilities;
    }

    //to get the active producers in the room 
    getProducerListForPeer() {
        let producerList: { userId: string; producer_id: string }[] = [];
        this._peers.forEach((peer) => {
          peer.get_producers().forEach((producer) => {
            producerList.push({
              userId: peer.id,
              producer_id: producer.id,
            });
          });
        });
        return producerList;
    }

    public async produce(
        userId: string,
        producerTransportId: string,
        rtpParameters: RtpParameters,
        kind: MediaKind
      ): Promise<string> {
        try {
          const peer = this._peers.get(userId);
          if (!peer) {
            throw new Error(`Peer with id ${userId} not found`);
          }
          console.log("the params are" , producerTransportId);
          const producer = await peer.createProducer(producerTransportId, rtpParameters, kind);

          if(!producer){
            throw new Error("Producer is undefined");
          }
      
          this.broadCast(userId, WebSocketEventType.NEW_PRODUCERS, [
            {
              producer_id: producer.id,
              userId: userId,
            },
          ]);
      
          return producer.id;
        } catch (err) {
          console.error("Error in produce:", err);
          throw err;
        }
      }

      async consume(
        userId: string,
        socket_id : string, 
        consumer_transport_id: string,
        producer_id: string,
        rtpCapabilities: RtpCapabilities
      ) {
        const routerCanConsume = this._router?.canConsume({
          producerId: producer_id,
          rtpCapabilities,
        });
        if (!routerCanConsume) {
          console.warn("Router cannot consume the given producer");
          return;
        }
    
        const peer = this._peers.get(userId);
    
        if (!peer) {
          console.warn("No Peer found with the given Id");
          return;
        }
    
        const consumer_created = await peer.createConsumer(
          consumer_transport_id,
          producer_id,
          rtpCapabilities
        );
    
        if (!consumer_created) {
          console.log("Couldn't create consumer");
          return;
        }
    
        const { consumer, params } = consumer_created;
    
        consumer.on("producerclose", () => {
          console.log("Consumer closed due to close event in producer id", {
            name: peer.name,
            consumer_id: consumer.id,
          });
    
          peer.removeConsumer(consumer.id);
    
          this.io.to(socket_id).emit(WebSocketEventType.CONSUMER_CLOSED, {
            consumer_id: consumer.id,
          });
        });
    
        return params;
      }
    
      

    broadCast(socket_id: string, name: string, data: any) {
        for (let otherID of Array.from(this._peers.keys()).filter(
          (id) => id !== socket_id
        )) {
          this.send(otherID, name, data);
        }
      }
      send(socketId: string, name: string, data: any) {
        this.io.to(socketId).emit(name, data);
      }
    
      closeProducer(producer_id: string, socketId: string) {
        const peer = this._peers.get(socketId);
        if (!peer) {
          console.log("No peeer found with the  socket id");
          return;
        }
        peer.closeProducer(producer_id);
        this.broadCast(socketId, WebSocketEventType.PRODUCER_CLOSED, {
          producer_id,
          userId: peer.id,
        });
        return;
      }

      addAndGetPausedProducer(producerId: string): string[] {
        if (!producerId) {
          throw new Error("No producerId found in pause producer");
        }
      
        if (!this._pausedVideoProducerIds.includes(producerId)) {
          this._pausedVideoProducerIds.push(producerId);
        }
      
        return this._pausedVideoProducerIds;
      }

      removeAndGetPausedProducer(producerId : string) : string[]  {
        if(!producerId){
          throw new Error("No producerId found in pause producer"); 
        }

        if(!this._pausedVideoProducerIds.includes(producerId)){
          console.warn("paused producer with this id not found");
          throw new Error("paused producer does not exists");
        }

        this._pausedVideoProducerIds = this._pausedVideoProducerIds.filter(id => id !== producerId);
        return this._pausedVideoProducerIds;
      }
       
}