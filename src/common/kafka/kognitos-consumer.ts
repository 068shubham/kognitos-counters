import { Consumer, EachBatchHandler, Kafka } from 'kafkajs'
import { KOGNITOS_COUNTERS_USER_INPUT_CONSUMER_TOPICS } from '../constant/kognitos-counters.constant'
import logger from '../../logger'

export default class KognitosConsumer {
    private consumer: Consumer
    private initialised = false

    constructor(kafka: Kafka, groupId: string) {
        this.consumer = kafka.consumer({ groupId })
    }

    async init() {
        if (!this.initialised) {
            const promise = new Promise<void>((resolve, reject) => {
                this.consumer.on('consumer.connect', (event) => {
                    if (!this.initialised) {
                        logger.info('Consumer initialised', event)
                        this.initialised = true
                        resolve()
                    } else {
                        logger.info('Consumer connected', event)
                    }
                })
                this.consumer.on('consumer.group_join', ({ payload }) => {
                    logger.info(`Consumer joined group: ${payload.groupId}`)
                    logger.debug('Consumer joined group', payload)
                })
                this.consumer.on('consumer.network.request_timeout', (event) => {
                    logger.error('Consumer timeout', event)
                    reject()
                })
            })
            await this.consumer.connect()
            await this.consumer.subscribe({
                topics: [KOGNITOS_COUNTERS_USER_INPUT_CONSUMER_TOPICS],
                fromBeginning: true
            })
            return promise
        }
    }

    async start(handler: EachBatchHandler) {
        await this.consumer.run({ eachBatchAutoResolve: false, eachBatch: handler })
    }

}
