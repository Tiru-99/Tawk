import { MediaKind, RtpCapabilities, Transport } from "mediasoup/types"
import { Consumer , Producer } from "mediasoup/types";
import { DtlsParameters , RtpParameters } from "mediasoup/types";

export default class Peer {
    id: string;
    name: string;
    private transport: Map<string, Transport>;
    private producers: Map<string, Producer>;
    private consumers: Map<string, Consumer>;

    constructor(id: string, name: string) {
        this.id = id;
        this.name = name;
        this.transport = new Map();
        this.producers = new Map();
        this.consumers = new Map();
    }

    //add a transport
    addTransport(transport: Transport) {
        this.transport.set(transport.id, transport);
    }

    //connect the transport 
    async connectTransport(transportId: string, dtlsParameters: DtlsParameters) {
        const transport = this.transport.get(transportId);
        console.log("The transport id is , ", transportId);
        if (!transport) {
            console.log("Error , cannot find transport");
        }
        await transport?.connect({ dtlsParameters });
    };

    async createProducer(producerTransportId: string, rtpParameters: RtpParameters, kind: MediaKind) {
        let producer = await this.transport.get(producerTransportId)?.produce({ rtpParameters, kind });
        if (!producer) {
            console.log("Error , cannot find the producer")
            return;
        }
        this.producers.set(producer.id, producer);

        producer.on("transportclose", () => {
            console.log("Producer Closed", producer.id);
            producer.close();
            this.producers.delete(producer.id);
        });

        return producer; 
    }

    async createConsumer(
        consumer_transport_id: string,
        producer_id: string,
        rtpCapabilities: RtpCapabilities
    ) {
        let consumerTransport = this.transport.get(consumer_transport_id);
        if (!consumerTransport) {
            console.warn("Create a transport for the specified consumer first ");
            return;
        }

        let consumer: Consumer;

        try {
            consumer = await consumerTransport.consume({
                producerId: producer_id,
                rtpCapabilities,
                paused: false,
            });
            console.log("Consumer successfully made")
        } catch (error) {
            console.error("Consume failed", error);
            return;
        }

        if (consumer.type === "simulcast") {
            await consumer.setPreferredLayers({
                spatialLayer: 2,
                temporalLayer: 2,
            });
        }

        this.consumers.set(consumer.id, consumer);

        consumer.on("transportclose", () => {
            console.log("Consumer transport close", {
                name: `${this.name}`,
                consumer_id: `${consumer.id}`,
            });
            this.consumers.delete(consumer.id);
        });

        return {
            consumer,
            user: {
                id: this.id,
                name: this.name,
            },
            params: {
                producerId: producer_id,
                id: consumer.id,
                kind: consumer.kind,
                rtpParameters: consumer.rtpParameters,
                type: consumer.type,
                producerPaused: consumer.producerPaused,
            },
        };
    }

    closeProducer(producer_id : string){
        console.log(this.producers);

        try{
            this.producers.get(producer_id)!.close(); 
        }catch(e){
            console.warn("Something went wrong while fetching producers" , e);
        };

        this.producers.delete(producer_id);
    }

    close(){
        this.transport.forEach((transport)=>transport.close());
    }

    removeConsumer(consumerId : string){
        this.consumers.delete(consumerId);
    }

    get_producers(){
        return this.producers ; 
    }

    get_transports(){
        return this.transport; 
    }

}