import { Kafka, logLevel } from 'kafkajs'
import { KOGNITOS_COUNTERS_CONSUMER_GROUP_ID } from '../constant/kognitos-counters.constant'
import KognitosAdmin from './kognitos-admin'
import KognitosConsumer from './kognitos-consumer'
import KognitosProducer from './kognitos-producer'

const kafka = new Kafka({
    clientId: 'kognitos',
    brokers: ['localhost:29092'],
    logLevel: logLevel.ERROR
})

export const producer = new KognitosProducer(kafka)
export const consumer = new KognitosConsumer(kafka, KOGNITOS_COUNTERS_CONSUMER_GROUP_ID)
export const admin = new KognitosAdmin(kafka)

interface KafkaInitConfig {
    initProducer?: boolean,
    initConsumer?: boolean
}

export async function initKafka(config?: KafkaInitConfig) {
    const { initProducer = false, initConsumer = false } = config || {}
    await admin.init()
    await admin.createTopics()
    if (initProducer) {
        await producer.init()
    }
    if (initConsumer) {
        await consumer.init()
    }
}
