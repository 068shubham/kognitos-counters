import 'dotenv/config';
import logger from './logger';

import { SQSClient } from '@aws-sdk/client-sqs';
import bodyParser from 'body-parser';
import { randomUUID } from 'crypto';
import express, { Express, Request, Response, Router } from 'express';
import databaseManager from './common/database';
import redis from './common/redis';
import { handler as sqsMessageHandler } from './sqs-message-handler';
import { handlerV1 as userRequestHandlerV1, handlerV2 as userRequestHandlerV2, handlerV3 as userRequestHandlerV3 } from './user-request-handler';

const app: Express = express()
const port = process.env.PORT || '8080'

const MAX_RETRY = 2
const messageQueue: { messageId: string, body: string, attempts: number }[] = []
let messageCount = 0
let processedCount = 0

SQSClient.prototype.send = ({ input: { MessageBody: body } }: any): any => {
    messageQueue.push({
        messageId: `${++messageCount + 1}`,
        body,
        attempts: 0
    })
}

const queueProcessor = () => {
    setTimeout(() => {
        if (messageQueue.length > 0) {
                        const Records: any[] = messageQueue.splice(0, 20)
            sqsMessageHandler({ Records })
                                .then(({ batchItemFailures }: { batchItemFailures: any[] }) => {
                    const messageIdToMessageMap = Records.reduce((prev, cur) => {
                        prev[cur.messageId] = cur
                        return prev
                    }, {})
                    processedCount += Records.length - batchItemFailures.length
                    const [retryMessages, dlqMessages] = batchItemFailures.reduce(([retryMessages, dlqMessages], { itemIdentifier }) => {
                        const cur = messageIdToMessageMap[itemIdentifier]
                        if (cur.attempts < MAX_RETRY) {
                            ++cur.attempts
                            retryMessages.push(cur)
                        } else {
                            dlqMessages.push(cur)
                        }
                        return [retryMessages, dlqMessages]
                    }, [[], []])
                    if (retryMessages.length > 0) {
                        messageQueue.push(...retryMessages)
                    }
                    if (dlqMessages.length > 0) {
                        dlqMessages.forEach(() => logger.error(`Messages pushed to dlq ${JSON.stringify(retryMessages)}`))
                    }
                })
                .catch((err: Error) => {
                    logger.error('Error while processing messages', err)
                })
                .finally(() => queueProcessor())
        } else {
            queueProcessor()
        }
    }, 0)
}

app.use(bodyParser.json())
app.get('/queue/depth', (req: Request, res: Response) => {
    res.json({ messageCount, processedCount, depth: messageCount - processedCount })
})
app.use((error: Error, req: Request, res: Response) => {
    res.status(500)
    res.json({
        error: error.message
    })
})

const routes = Router()
routes.get('/kognitos/api/v1/word', async (req: Request, res: Response) => {
        const query: any = req.query
        const gateWayRequest: any = { queryStringParameters: query, requestContext: { requestId: randomUUID() } }
    const out = await userRequestHandlerV1(gateWayRequest)
    res.status(out.statusCode).json(JSON.parse(out.body))
})
routes.get('/kognitos/api/v2/word', async (req: Request, res: Response) => {
        const query: any = req.query
        const gateWayRequest: any = { queryStringParameters: query, requestContext: { requestId: randomUUID() } }
    const out = await userRequestHandlerV2(gateWayRequest)
    res.status(out.statusCode).json(JSON.parse(out.body))
})
routes.get('/kognitos/api/v3/word', async (req: Request, res: Response) => {
        const query: any = req.query
        const gateWayRequest: any = { queryStringParameters: query, requestContext: { requestId: randomUUID() } }
    const out = await userRequestHandlerV3(gateWayRequest)
    res.status(out.statusCode).json(JSON.parse(out.body))
})

app.use('/local', routes)

async function init() {
    await databaseManager.init();
    await redis.init();
}
init()
    .then(() => app.listen(port, () => logger.info(`Server listening on port ${port}`)))
    .catch(err => {
        logger.error('Error initialising app', err)
        process.exit(1)
    }).finally(() => queueProcessor())
