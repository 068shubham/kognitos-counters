import logger from '../../logger'

import { Kafka } from 'kafkajs'
import KognitosConsumer from './kognitos-consumer'
import KognitosProducer from './kognitos-producer'

export const KOGNITOS_COUNTERS_USER_INPUT_TOPIC = 'kognitos-counters-user-input'
export const KOGNITOS_COUNTERS_CONSUMER_GROUP_ID = 'user-input-asyn-handler-1'

const kafka = new Kafka({
    clientId: 'kognitos',
    brokers: ['localhost:29092']
})

export const producer = new KognitosProducer(kafka)
export const consumer = new KognitosConsumer(kafka, KOGNITOS_COUNTERS_CONSUMER_GROUP_ID)

export async function initKafka() {
    await producer.init()
    await consumer.init()
    logger.info('Kafka producer and consumer initialised')
}
