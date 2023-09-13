import 'dotenv/config'
import logger from '../logger'

import bodyParser from 'body-parser'
import express, { Express, NextFunction, Request, Response, Router } from 'express'
import databaseManager from '../common/database'
import redis from '../common/redis'
import { logError } from '../common/util/error-handler.util'
import { AsyncMessage, AsyncQueueMessageHandler } from './async-queue'
import { QueueAlreadyRegistered, QueueManager, QueueNotFound } from './queue-manager'

const app: Express = express()
const port = process.env.PORT || '8081'

app.use(bodyParser.json())

const queueManager = new QueueManager()

const defaultHandler: AsyncQueueMessageHandler = {
    process: async (messages: AsyncMessage[]) => {
        logger.info(`Total ${messages.length} messages`)
        return {
            failedMessageIds: []
        }
    }
}

const routes = Router()

routes.post('/:queueName/register', (req: Request, res: Response, next: NextFunction) => {
    const { queueName } = req.params
    try {
        queueManager.register(queueName, defaultHandler)
        res.json({ message: 'Queue registered' })
    } catch (err: unknown) {
        if (err instanceof QueueAlreadyRegistered) {
            res.status(400).json({ message: err.message })
        } else {
            logError(err, `Error registering queue with name ${queueName}`)
            next(err)
        }
    }

})

routes.put('/:queueName/push', (req: Request, res: Response, next: NextFunction) => {
    const { queueName } = req.params
    try {
        if (!queueManager.isRegistered(queueName)) {
            queueManager.register(queueName, defaultHandler)
        }
        const queue = queueManager.getQueue(queueName)
        const message = req.body
        const messageId = queue.publish(message)
        res.json({ messageId })
    } catch (err: unknown) {
        if (err instanceof QueueNotFound) {
            res.status(400).json({ message: err.message })
        } else {
            logError(err, `Error in push to ${queueName}`)
            next(err)
        }
    }
})

routes.get('/:queueName/depth', (req: Request, res: Response, next: NextFunction) => {
    const { queueName } = req.params
    try {
        const queue = queueManager.getQueue(queueName)
        res.json({ depth: queue.depth, total: queue.totalMessages, processed: queue.processedMessages })
    } catch (err: unknown) {
        if (err instanceof QueueNotFound) {
            res.status(400).json({ message: err.message })
        } else {
            logError(err, `Error fetching depth for queue name ${queueName}`)
            next(err)
        }
    }
})

app.use('/mysqs', routes)

app.use((req: Request, res: Response) => {
    res.status(404).json({
        message: 'Route does not exist'
    })
})

app.use((error: Error, req: Request, res: Response) => {
    res.status(500).json({
        error: error.message
    })
})

async function init() {
    await databaseManager.init()
    await redis.init()
}

init()
    .then(() => app.listen(port, () => logger.info(`Server listening on port ${port}`)))
    .catch(err => {
        logger.error('Error initialising app', err)
        process.exit(1)
    })
