import { Kafka, Producer } from 'kafkajs'
import { KOGNITOS_COUNTERS_USER_INPUT_TOPIC } from '.'
import logger from '../../logger'

export default class KognitosProducer {
    private producer: Producer

    constructor(kafka: Kafka) {
        this.producer = kafka.producer()
    }

    async init() {
        await this.producer.connect()
    }

    async send(value: any) {
        if (value == null) {
            logger.warn('null values not supported in KognitosProducer')
            return
        }
        if (!(value instanceof Buffer)) {
            if (typeof value == 'object') {
                value = JSON.stringify(value)
            } else {
                value = `${value}`
            }
        }
        this.producer.send({ topic: KOGNITOS_COUNTERS_USER_INPUT_TOPIC, messages: [{ value }] })
    }
}
