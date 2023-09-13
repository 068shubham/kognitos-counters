import { AsyncQueue, AsyncQueueMessageHandler } from './async-queue';

interface QueueRegistry {
    [queueName: string]: AsyncQueue
}

export class QueueAlreadyRegistered extends Error {
    constructor(queueName: string) {
        super(`Queue with name ${queueName} alredy registered`)
    }
}

export class QueueNotFound extends Error {
    constructor(queueName: string) {
        super(`Queue with name ${queueName} does not exist`)
    }
}

export class QueueManager {
    queueRegistry: QueueRegistry

    constructor() {
        this.queueRegistry = {}
    }

    register<H extends AsyncQueueMessageHandler>(queueName: string, handler: H) {
        if (this.queueRegistry[queueName]) {
            throw new QueueAlreadyRegistered(queueName)
        } else {
            this.queueRegistry[queueName] = new AsyncQueue({ handler })
        }
    }

    isRegistered(queueName: string) {
        return this.queueRegistry[queueName] !== undefined
    }

    getQueue(queueName: string) {
        if (this.queueRegistry[queueName]) {
            return this.queueRegistry[queueName]
        } else {
            throw new QueueNotFound(queueName)
        }
    }

}
