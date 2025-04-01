
import * as mediasoup from 'mediasoup';
import { config } from './config';
import { Router } from 'mediasoup/node/lib/RouterTypes';

export const createMediasoupWorker = async() => {
    //create a mediasoup worker 
    try {
      const newWorker = await mediasoup.createWorker({
          rtcMinPort : 2000, 
          rtcMaxPort : 2020
      });

      console.log("Worker process id" , newWorker.pid)

    newWorker.on("died" , (error)=> {
        console.error("Mediasoup worker has died ");

        setTimeout(() => {
            process.exit()
        } , 2000);
    });
    
    return newWorker; 
    } catch (error) {
      console.log("Something went wrong while creating a worker" , error);
      throw error;
    }

}

export const createWebRTCTransport = async(mediasoupRouter : Router) => {
    const {
        maxIncomingBitrate , 
        initialAvailableOutgoingBitrate,
        listenIps
    } = config.mediaSoup.webRTCTransport


    const transport = await mediasoupRouter.createWebRtcTransport({
        listenIps: [...listenIps],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
        initialAvailableOutgoingBitrate,
      });

      if(maxIncomingBitrate){
       try {
         await transport.setMaxIncomingBitrate(maxIncomingBitrate);
       } catch (error) {
         console.log("Error while setting max bitrate");
       }
      };

      return {
        transport , 
        params : 
        {
          id : transport.id , 
          iceParameters : transport.iceParameters ,
          iceCandidates : transport.iceCandidates ,
          dtlsParameters : transport.dtlsParameters
        }
      }
} 