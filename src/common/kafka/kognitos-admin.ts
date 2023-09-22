import logger from '../../logger'

import { Admin, Kafka } from 'kafkajs'
import { KOGNITOS_COUNTERS_USER_INPUT_TOPIC_V1, KOGNITOS_COUNTERS_USER_INPUT_TOPIC_V2, KOGNITOS_COUNTERS_USER_INPUT_TOPIC_V3 } from '../constant/kognitos-counters.constant'
import redisClient from '../redis'

const CREATE_TOPIC_LOCK_KEY = 'kafka:admin:topic:create'

const topics = [
    {
        topic: KOGNITOS_COUNTERS_USER_INPUT_TOPIC_V1,
        numPartitions: 2
    },
    {
        topic: KOGNITOS_COUNTERS_USER_INPUT_TOPIC_V2,
        numPartitions: 2
    },
    {
        topic: KOGNITOS_COUNTERS_USER_INPUT_TOPIC_V3,
        numPartitions: 2
    }
]

export default class KognitosAdmin {
    private admin: Admin

    constructor(kafka: Kafka) {
        this.admin = kafka.admin()
    }

    async init() {
        await this.admin.connect()
    }

    async createTopics() {
        const lockAcquired = await redisClient.acquireLock(CREATE_TOPIC_LOCK_KEY)
        try {
            if (lockAcquired) {
                const existinsTopics = new Set(await this.admin.listTopics())
                const topicsToCreate = topics.filter(t => !existinsTopics.has(t.topic))
                if (topicsToCreate.length > 0) {
                    const created = await this.admin.createTopics({
                        topics: topicsToCreate,
                    })
                    if (created) {
                        logger.info('Topics created')
                    } else {
                        throw new Error('Topics could not be created')
                    }
                }
            }
        } finally {
            await redisClient.releaseLock(CREATE_TOPIC_LOCK_KEY)
        }
    }

}
