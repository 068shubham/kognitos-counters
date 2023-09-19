import { Consumer, EachBatchHandler, Kafka } from 'kafkajs'
import { KOGNITOS_COUNTERS_USER_INPUT_TOPIC } from '.'

export default class KognitosConsumer {
    private consumer: Consumer

    constructor(kafka: Kafka, groupId: string) {
        this.consumer = kafka.consumer({ groupId })
    }

    async init() {
        await this.consumer.connect()
        await this.consumer.subscribe({
            topics: [KOGNITOS_COUNTERS_USER_INPUT_TOPIC],
            fromBeginning: true
        })
    }

    async subscribe(handler: EachBatchHandler) {
        this.consumer.run({ eachBatchAutoResolve: false, eachBatch: handler })
    }

}
