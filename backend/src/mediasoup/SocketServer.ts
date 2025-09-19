import * as io from "socket.io";
import Room from "./Room";
import { WebSocketEventType } from "./enums";
import dotenv from 'dotenv'; 
import { createMediasoupWorker } from "../utils/helpers";

dotenv.config({
    path:'./.env'
})

interface SocketCallback{
    (response : any) : void
}

declare module "socket.io" {
    interface Socket {
        roomId?: string;
    }
}

//Create a socket class 
export class SocketService {
    private _io: io.Server;
    private _roomList: Map<string, Room>;
  
    constructor(ioServer: io.Server) {
      console.log("Initializing socket server");
      this._io = ioServer;  // use the passed io instance directly
      this._roomList = new Map();
  
      try {
        this.listenToWebSockets(this._io);
      } catch (error) {
        console.log("ERROR in socket", error);
      }
    }

    private listenToWebSockets(io : io.Server){
        io.on("connection" , (socket)=> {
            socket.on(WebSocketEventType.CREATE_ROOM , async({roomId} , cb : SocketCallback)=> {
                if(!roomId){
                    console.log("No room id provided!" , socket.id);
                    cb({ error : "No room id provided to create room"});
                    return ; 
                }
                let room = this._roomList.get(roomId);

                if(!room){
                    const worker = await createMediasoupWorker();  
                    this._roomList.set(roomId , new Room(roomId , io , worker));
                    console.log("Room created successfully!");
                    cb({ message : "Room created successfully"});
                } else {
                    console.log("Room with this id already exists"); 
                    cb({error : "Room with this id already exists"});
                }
            });

            socket.on(WebSocketEventType.DISCONNECT , () => {
                console.log(`User Disconnected`);
            });

            socket.on(WebSocketEventType.JOIN_ROOM, async (
              data: { userId: string; roomId: string; name: string },
              cb: SocketCallback
            ) => {
              const { userId, roomId, name } = data;
            
              if (!userId || !roomId || !name) {
                console.log("Missing Data in JOIN_ROOM", userId, name, roomId);
                cb({ error: "Missing data in JOIN_ROOM" });
                return;
              }
            
              let room = this._roomList.get(roomId);
            
              if (!room) {
                console.log("Room not found, creating a room");
                const worker = await createMediasoupWorker();
                this._roomList.set(roomId, new Room(roomId, io, worker));
              }
            
              room = this._roomList.get(roomId); 
            
              if (!room) {
                cb({ error: "Failed to create or retrieve room" });
                return;
              }
            
              const peer = room.createPeer(name, userId);
              socket.roomId = roomId;
              //sending all the peers in bulk 

              socket.join(roomId);
              socket.to(roomId).emit(WebSocketEventType.USER_JOINED, {
                message: `${name} joined the room`,
                user: peer,
              });
            
              console.log("Room joined successfully", { name, roomId });
              cb({ message: "Room joined successfully" });
            });
            

            socket.on(WebSocketEventType.EXIT_ROOM , ( {userId} , cb )=> {

                if(!userId){
                    console.log("Missing userId");
                    cb({error : "Not in a room"});
                    return 
                }
                if(!socket.roomId){
                    console.log("Not already in a room"); 
                    cb({error : "Not in a room"});
                    return; 
                }

                console.log("inside the exit room");
                const room = this._roomList.get(socket.roomId);
                if(!room){
                    console.log("Room does not exist");
                    cb({error : "Room does not exist"});
                    return ; 
                }

                const peerData = room._peers.get(userId);
                const producersMap = peerData?.get_producers();
                const producerIds = producersMap ? Array.from(producersMap.keys()) : [];

                console.log("The producer Ids is" , producerIds);

                const peer = room.removePeer(userId);
                if(room._peers.size <= 0 ){
                    this._roomList.delete(room.id);
                }

                socket.to(room.id).emit(WebSocketEventType.USER_LEFT , {
                    message : `${peer?.name} left the room` ,
                    user : peer ,
                    leavingProducers : producerIds
                })

                console.log("Peer removed successfully!" , peer);
            });

            socket.on(WebSocketEventType.GET_IN_ROOM_USERS , ( _ , cb : SocketCallback) => {
                const roomId= socket.roomId as string;
                const room = this._roomList.get(roomId)
                if(!room){
                    console.log("Room does not exist");
                    cb({error : "Room does not exist"});
                    return ; 
                } 
                cb({users : room.getCurrentPeers(roomId)})
                console.log("Current users bhej diya!")
            });

            socket.on(WebSocketEventType.GET_PRODUCERS , (_ , cb:SocketCallback)=> {
                const roomId = socket.roomId as string ;
                const room = this._roomList.get(roomId); 

                if(!room){
                    cb({error : "Room does not exists"});
                    console.log("Room does not exists");
                    return; 
                }

                let producerList = room.getProducerListForPeer();
                cb({producerList});
                console.log("success sent the producer list");
            });


            socket.on(WebSocketEventType.GET_ROUTER_RTP_CAPABILITIES , (_ , cb : SocketCallback)=>{
                const roomId = socket.roomId as string ; 
                const room = this._roomList.get(roomId); 
                if(!room){
                    cb({error : "Room does not exists"});
                    console.log("Room does not exists");
                    return; 
                }
                const rtpCapabilities = room.getRtpCapabilities();
                cb({rtpCapabilities});
                console.log("Sent the rtp" , rtpCapabilities); 
            });

            socket.on(
                WebSocketEventType.CREATE_WEBRTC_TRANSPORT,
                async ({userId}, cb: SocketCallback) => {
                  const room = this._roomList.get(socket.roomId!);
                  if (!room) {
                    console.log(WebSocketEventType.ERROR, "Couldn't find room");
                    cb({ error: "Couldn't find room" });
                    return;
                  }
        
                  const params = await room.createWebRtcTransport(userId);
                  cb(params);
                  console.log("created transport  , the params are " , params); 
                  return;
                }
            );

            socket.on(WebSocketEventType.CONNECT_TRANSPORT , async({userId , transportId , dtlsParameters} , cb:SocketCallback)=> {
                const room = this._roomList.get(socket.roomId!);
                if(!room){
                    if (!room) {
                        console.log(WebSocketEventType.ERROR, "Couldn't find room");
                        cb({ error: "Couldn't find room" });
                        return;
                      }
                }

                await room.connectPeerTransport(userId , transportId , dtlsParameters);
                cb("Success");

            });

            socket.on(
                WebSocketEventType.PRODUCE,
                async (
                  { userId , kind, rtpParameters, producerTransportId },
                  cb: SocketCallback
                ) => {
                  console.log("IN PRODUCE EVENT");
        
                  const room = this._roomList.get(socket.roomId!);
                  console.log(room?._peers);
                  if (!room) {
                    return cb({ ERROR: "error couldn't find the room" });
                  }
        
                  let producer_id = (await room.produce(
                    userId,
                    producerTransportId,
                    rtpParameters,
                    kind
                  )) as string;
                  
                  const newProducers = [
                    {
                      producer_id,
                      userId,
                    },
                  ];
                  
                  //emit new producers 
                  socket.to(socket.roomId!).emit(WebSocketEventType.NEW_PRODUCERS , newProducers)
                  cb({
                    producer_id,
                    userId 
                  });

                }
              );

            socket.on(
                WebSocketEventType.CLOSE_PRODUCER,
                ({ producer_id }, cb: SocketCallback) => {
                  const room = this._roomList.get(socket.roomId!)!;
                  console.log(WebSocketEventType.CLOSE_PRODUCER, producer_id);
        
                  if (room) {
                    room.closeProducer(producer_id, socket.id);
                  }
                }
            );

            socket.on(
                WebSocketEventType.CONSUME,
                async (
                  { userId , consumerTransportId, producerId, rtpCapabilities },
                  cb: SocketCallback
                ) => {
                  const room = this._roomList.get(socket.roomId!);
        
                  if (!room) {
                    console.warn("No room associated with the id ");
                    return;
                  }
        
                  const params = await room.consume(
                    userId,
                    socket.id,
                    consumerTransportId,
                    producerId,
                    rtpCapabilities
                  );
        
                  if (!params) {
                    console.log("Consumer params couldn't be passed");
        
                    return;
                  }
        
                  cb(params);
                }
              );
            
              socket.on(WebSocketEventType.ADD_PAUSED_PRODUCER, ({videoProducerId}, cb) => {
                
                const room = this._roomList.get(socket.roomId!); 

                if(!room){
                  console.warn("No room present!")
                  cb({error : "Room does not exists"}); 
                }

                if(!videoProducerId){
                  console.warn("No videoProducer found")
                  cb({error : "Video ProducerId not found"});
                }

              const pausedProducers = room?.addAndGetPausedProducer(videoProducerId);
              socket.to(socket.roomId!).emit(WebSocketEventType.GET_PAUSED_PRODUCERS , pausedProducers);
                // Send acknowledgment (optional)
                cb({ success: true});
              });

              socket.on(WebSocketEventType.REMOVE_PAUSED_PRODUCER , ({videoProducerId} , cb) => {
                const room = this._roomList.get(socket.roomId!); 

                if(!room){
                  console.warn("No room present!")
                  cb({error : "Room does not exists"}); 
                }

                if(!videoProducerId){
                  console.warn("No videoProducer found")
                  cb({error : "Video ProducerId not found"});
                }

                const pausedProducers = room?.removeAndGetPausedProducer(videoProducerId);
                socket.to(socket.roomId!).emit(WebSocketEventType.GET_PAUSED_PRODUCERS , pausedProducers);
                cb({success : true }); 
              });
              
              
        })
    }
}