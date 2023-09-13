import logger from '../logger'

import { randomUUID } from 'crypto'
import { Queue } from '../common/model/queue.model'
import { logError } from '../common/util/error-handler.util'
import { AsyncHandler, AsyncProcessor } from './async-processor'

export interface AsyncMessageProperties {
    maxRetries?: number
    retryDelay?: number
}

export class AsyncMessage implements AsyncMessageProperties {
    messageId: string
    body: any
    attemps: number

    maxRetries?: number | undefined
    retryDelay?: number | undefined

    constructor({ messageId, body, attemps, maxRetries, retryDelay }: AsyncMessage) {
        this.messageId = messageId
        this.body = body
        this.attemps = attemps
        this.maxRetries = maxRetries
        this.retryDelay = retryDelay
    }
}

export interface AsyncMessageResponse {
    failedMessageIds: string[]
}

export interface AsyncQueueConfig {
    batchSize?: number
    handler: AsyncQueueMessageHandler
}

export interface AsyncQueueMessageHandler {
    process: (messages: AsyncMessage[]) => Promise<AsyncMessageResponse>
}

export class AsyncQueue {
    private _totalMessages = 0
    private _processedMessages = 0
    private queue: Queue<AsyncMessage>
    private processor: AsyncProcessor<AsyncMessage[], void>
    private batchSize: number
    private handler: AsyncQueueMessageHandler

    constructor({ handler, batchSize = 50 }: AsyncQueueConfig) {
        this.batchSize = batchSize
        this.handler = handler
        this.queue = new Queue()
        this.processor = new AsyncProcessor({ handler: this.getAsynHandler() })
        this.processor.start()
    }

    private getAsynHandler(): AsyncHandler<AsyncMessage[], void> {
        return {
            execute: this.execute.bind(this),
            error: this.handleError.bind(this),
            messages: this.getMessages.bind(this)
        }
    }

    private retryHandler(messageIds: string[]) {
        logger.info(`Retrying ${messageIds.length} messages`)
    }

    private async execute(messages: AsyncMessage[]): Promise<void> {
        const { failedMessageIds } = await this.handler.process(messages)
        const processed = messages.length - failedMessageIds.length
        if (failedMessageIds && failedMessageIds.length) {
            this.retryHandler(failedMessageIds)
        }
        this._processedMessages += processed
    }

    private async getMessages(count: number) {
        const batches: AsyncMessage[][] = []
        while (!this.queue.isEmpty() && batches.length < this.batchSize) {
            const batch: AsyncMessage[] = []
            while (!this.queue.isEmpty() && batch.length < count) {
                const cur = this.queue.poll()
                if (cur !== null) {
                    batch.push(cur)
                }
            }
            batches.push(batch)
        }
        return batches
    }

    private handleError(err: unknown) {
        logError(err, 'Error while processing messages')
        // Todo: Add retries
    }

    publish(message: any, properties?: AsyncMessageProperties) {
        const record: AsyncMessage = new AsyncMessage({
            messageId: randomUUID().toString(),
            body: message,
            attemps: 0,
            ...properties
        })
        this.queue.add(record)
        ++this._totalMessages
        return record.messageId
    }

    get totalMessages() {
        return this._totalMessages
    }

    get depth() {
        return this.queue.size
    }

    get processedMessages() {
        return this._processedMessages
    }

}
