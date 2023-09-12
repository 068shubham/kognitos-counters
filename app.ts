import 'dotenv/config';
import logger from './src/logger';

import bodyParser from 'body-parser';
import express, { Express, NextFunction, Request, Response, Router } from 'express';
import { handler as sqsMessageHandler } from './src/sqs-message-handler';
import { handlerV1 as userRequestHandlerV1, handlerV2 as userRequestHandlerV2 } from './src/user-request-handler';
import { SqsClient } from './src/common/sqs/sqs';
import { randomUUID } from 'crypto';
import { DatabaseManager } from './src/common/database';
import { RedisClient } from './src/common/redis';

const app: Express = express()
const port = process.env.PORT || '8080'

const MAX_RETRY = 20
const messageQueue: { messageId: string, body: string, attempts: number }[] = []
var messageCount = 0
var processedCount = 0

SqsClient.pushToSqs = (sqsMessageBody: any): any => {
    messageQueue.push({
        messageId: `${++messageCount + 1}`,
        body: JSON.stringify(sqsMessageBody),
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
                        dlqMessages.forEach((cur: any) => logger.error(`Messages pushed to dlq ${JSON.stringify(retryMessages)}`))
                    }
                })
                .catch((err: Error) => {
                    logger.error("Error while processing messages", err)
                })
                .finally(() => queueProcessor())
        } else {
            queueProcessor()
        }
    }, 0)
}

app.use(bodyParser.json())
app.get("/queue/depth", (req: Request, res: Response) => {
    res.json({ messageCount, processedCount, depth: messageCount - processedCount })
})
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
    res.status(500)
    res.json({
        error: error.message
    })
})

const routes = Router()
routes.get("/kognitos/api/v1/word", async (req: Request, res: Response) => {
    const query: any = req.query
    const gateWayRequest: any = { queryStringParameters: query, requestContext: { requestId: randomUUID() } }
    const out = await userRequestHandlerV1(gateWayRequest)
    res.status(out.statusCode).json(JSON.parse(out.body))
})
routes.get("/kognitos/api/v2/word", async (req: Request, res: Response) => {
    const query: any = req.query
    const gateWayRequest: any = { queryStringParameters: query, requestContext: { requestId: randomUUID() } }
    const out = await userRequestHandlerV2(gateWayRequest)
    res.status(out.statusCode).json(JSON.parse(out.body))
})

app.use("/local", routes)

async function init() {
    queueProcessor()
    await DatabaseManager.init();
    await RedisClient.init();
}
init()
    .then(() => app.listen(port, () => logger.info(`Server listening on port ${port}`)))
    .catch(err => {
        logger.error("Error initialising app", err)
        process.exit(1)
    })
