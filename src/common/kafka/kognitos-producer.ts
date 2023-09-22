import logger from '../../logger'

import { Kafka, Producer } from 'kafkajs'

export default class KognitosProducer {
    private producer: Producer
    private initialised = false

    constructor(kafka: Kafka) {
        this.producer = kafka.producer({
            allowAutoTopicCreation: false
        })
    }

    async init() {
        if (!this.initialised) {
            const promise = new Promise<void>((resolve, reject) => {
                this.producer.on('producer.connect', (event) => {
                    logger.info('Producer connected', event)
                    this.initialised = true
                    resolve()
                })
                this.producer.on('producer.network.request_timeout', (event) => {
                    logger.error('Producer timeout', event)
                    reject()
                })
            })
            await this.producer.connect()
            return promise
        }
    }

    async send(topic: string, value: any) {
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
        this.producer.send({ topic, messages: [{ value }] })
    }

}
