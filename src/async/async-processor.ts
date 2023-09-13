import logger from '../logger'

import { Logger } from 'winston'

export interface AsyncHandler<M, R> {
    execute: (message: M) => Promise<R>
    error: (response: unknown) => void
    messages: (count: number) => Promise<M[]>
}

export interface AsyncProcessorConfig<M, R> {
    handler: AsyncHandler<M, R>
    logger?: Logger
    concurrency?: number
    processingDelay?: number
    startDelay?: number
}

export enum AsyncProcessorState {
    INITIALISED, RUNNING, STOPPED, ERRORED
}

export class AsyncProcessor<M, R> {
    private handler: AsyncHandler<M, R>
    private concurrency: number
    private processingDelay: number
    private startDelay: number

    private logger: Logger
    private state: AsyncProcessorState = AsyncProcessorState.INITIALISED

    constructor(config: AsyncProcessorConfig<M, R>) {
        this.handler = config.handler
        this.concurrency = config.concurrency || 20
        this.processingDelay = config.processingDelay || 0
        this.startDelay = config.startDelay || 0
        this.logger = config.logger || logger
    }

    private async getNextBatch(): Promise<M[]> {
        const nextMessages = await this.handler.messages(this.concurrency)
        return nextMessages
    }

    private handleError(err: unknown) {
        setTimeout(() => {
            try {
                this.handler.error(err)
            } catch (err) {
                this.logger.error(`Error in handleError: ${err}`)
            }
        }, 0)
    }

    private async processSingleMessage(message: M): Promise<void> {
        const startMillis = Date.now()
        try {
            await this.handler.execute(message)
        } catch (err: unknown) {
            this.handleError(err)
        } finally {
            this.logger.debug(`Processing took ${Date.now() - startMillis}ms`)
        }
    }

    private async process() {
        const startMillis = Date.now()
        try {
            const messagesToProcess = await this.getNextBatch()
            const promises = messagesToProcess.map((m) => this.processSingleMessage(m))
            await Promise.all(promises)
        } catch (err: unknown) {
            this.logger.error('Error while processing', err)
        } finally {
            const currentDelay = Date.now() - startMillis
            this.logger.debug(`Processing took ${currentDelay}ms`)
            const timeout = Math.max(this.processingDelay - currentDelay, 0)
            this.run(timeout)
        }
    }

    private async run(timeout: number) {
        if (this.state == AsyncProcessorState.RUNNING) {
            setTimeout(() => this.process(), timeout)
        }
    }

    start() {
        if (this.state != AsyncProcessorState.RUNNING) {
            this.state = AsyncProcessorState.RUNNING
            this.run(this.startDelay)
        } else {
            throw new Error('Already started.')
        }
    }

    stop() {
        this.state = AsyncProcessorState.STOPPED
    }

}
