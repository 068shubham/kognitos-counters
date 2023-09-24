import 'dotenv/config'

import logger from './logger'

import { sqsMessageHandlerWrapper } from './app-handler'
import { consumer, initKafka } from './common/kafka'

async function init() {
    await initKafka({ initConsumer: true })
    consumer.start(sqsMessageHandlerWrapper).catch(err => {
        logger.error('Error in consumer', err)
    })
}
init().then(() => {
    logger.info('Consumer started')
}).catch(err => {
    logger.error('Error initialising consumer', err)
})
