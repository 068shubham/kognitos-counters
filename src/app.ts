import 'dotenv/config'
import logger from './logger'
import './prototypes'

import bodyParser from 'body-parser'
import { randomUUID } from 'crypto'
import express, { Express, Request, Response, Router } from 'express'
import databaseClient from './common/database'
import { consumer, initKafka } from './common/kafka'
import redisClient from './common/redis'
import { handlerV1 as userRequestHandlerV1, handlerV2 as userRequestHandlerV2, handlerV3 as userRequestHandlerV3 } from './user-request-handler'
import { sqsMessageHandlerWrapper } from './app-handler'

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

async function init() {
    await databaseClient.init()
    await redisClient.init()
    await initKafka()
    await consumer.start(sqsMessageHandlerWrapper)
}
init()
    .then(() => app.listen(port, () => logger.info(`Server listening on port ${port}`)))
    .catch(err => {
        logger.error('Error initialising app', err)
        process.exit(1)
    })
