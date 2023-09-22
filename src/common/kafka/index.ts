import { Kafka, logLevel } from 'kafkajs'
import { KOGNITOS_COUNTERS_CONSUMER_GROUP_ID } from '../constant/kognitos-counters.constant'
import KognitosAdmin from './kognitos-admin'
import KognitosConsumer from './kognitos-consumer'
import KognitosProducer from './kognitos-producer'

const kafka = new Kafka({
    clientId: 'kognitos',
    brokers: ['localhost:29092'],
    logLevel: logLevel.WARN
})

export const producer = new KognitosProducer(kafka)
export const consumer = new KognitosConsumer(kafka, KOGNITOS_COUNTERS_CONSUMER_GROUP_ID)
export const admin = new KognitosAdmin(kafka)

export async function initKafka() {
    await admin.init()
    await admin.createTopics()
    await producer.init()
    await consumer.init()
}
