import 'dotenv/config'
import logger from './logger'
import './prototypes'

import bodyParser from 'body-parser'
import { randomUUID } from 'crypto'
import express, { Express, Request, Response, Router } from 'express'
import { EachBatchPayload } from 'kafkajs'
import { consumer, producer } from './common/kafka'
import { handler } from './sqs-message-handler'
import { handlerV1 as userRequestHandlerV1, handlerV2 as userRequestHandlerV2, handlerV3 as userRequestHandlerV3 } from './user-request-handler'
import databaseClient from './common/database'
import redisClient from './common/redis'

const app: Express = express()
const port = process.env.PORT || '8080'

app.use(bodyParser.json())

const routes = Router()
routes.get('/v1/word', async (req: Request, res: Response) => {
    const query: any = req.query
    const gateWayRequest: any = { queryStringParameters: query, requestContext: { requestId: randomUUID() } }
    const out = await userRequestHandlerV1(gateWayRequest)
    res.status(out.statusCode).json(JSON.parse(out.body))
})
routes.get('/v2/word', async (req: Request, res: Response) => {
    const query: any = req.query
    const gateWayRequest: any = { queryStringParameters: query, requestContext: { requestId: randomUUID() } }
    const out = await userRequestHandlerV2(gateWayRequest)
    res.status(out.statusCode).json(JSON.parse(out.body))
})
routes.get('/v3/word', async (req: Request, res: Response) => {
    const query: any = req.query
    const gateWayRequest: any = { queryStringParameters: query, requestContext: { requestId: randomUUID() } }
    const out = await userRequestHandlerV3(gateWayRequest)
    res.status(out.statusCode).json(JSON.parse(out.body))
})

app.use('/api', routes)

app.use((_req: Request, res: Response): void => {
    res.status(404).json({
        error: 'Not found'
    })
    return
})

app.use((error: Error, _req: Request, res: Response): void => {
    res.status(500).json({
        error: error.message
    })
    return
})

const resolvedOffSets = new Set()

const sqsMessageHandlerWrapper = async ({ batch: { topic, messages }, resolveOffset }: EachBatchPayload) => {
    logger.info(`${messages.length} kafka messages received`, { topic })
    const { batchItemFailures } = await handler({
        Records: messages.filter(({ value, offset }) => value !== null && !resolvedOffSets.has(offset)).map(m => ({
            body: m.value?.toString(),
            messageId: m.offset
        }))
    })
    if (batchItemFailures && batchItemFailures.length > 0) {
        const errorMessage = `${batchItemFailures.length} messages failed`
        logger.error(errorMessage)
        const failedOffSets = new Set(batchItemFailures.map(f => +f.itemIdentifier))
        const minFailed = Math.min(...failedOffSets)
        const offSetsToResolve = messages.filter(({ offset }) => !failedOffSets.has(+offset))
        offSetsToResolve.forEach(({ offset }) => resolvedOffSets.add(offset))
        offSetsToResolve.sort()
        let offSetToResolve = '-1'
        for (const { offset } of offSetsToResolve) {
            if (+offset >= minFailed) {
                break
            } else {
                offSetToResolve = offset
            }
        }
        if (offSetToResolve != '-1') {
            logger.info(`resolving ${offSetToResolve} offset`)
            resolveOffset(offSetToResolve)
        }
    } else {
        const offSetsToResolve = messages.map(({ offset }) => +offset)
        resolveOffset(`${Math.max(...offSetsToResolve)}`)
    }
}

async function init() {
    await databaseClient.init()
    await redisClient.init()
    await producer.init()
    await consumer.init()
    consumer.subscribe(sqsMessageHandlerWrapper)
}
init()
    .then(() => app.listen(port, () => logger.info(`Server listening on port ${port}`)))
    .catch(err => {
        logger.error('Error initialising app', err)
        process.exit(1)
    })
