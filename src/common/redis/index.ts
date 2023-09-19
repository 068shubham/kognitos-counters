import { Cluster, ClusterOptions, Redis, RedisOptions } from 'ioredis'
import { SEARCH_KEY_CACHE_EXPIRY } from '../constant/kognitos-counters.constant'
import logger from '../../logger'
import { logError } from '../util/error-handler.util'

const INITIALISATION_TIMEOUT = 50 * 1000
const CONNECTION_TIMEOUT = 2 * 1000
const COMMAND_TIMEOUT = 500

const BASIC_REDIS_OPTIONS: RedisOptions = {
    connectTimeout: CONNECTION_TIMEOUT,
    commandTimeout: COMMAND_TIMEOUT
}

const resetErrorsCount = (redisErrorsCount: { [error: string]: number }) => Object.keys(redisErrorsCount).forEach(e => { redisErrorsCount[e] = 0 })

export class RedisClient {

    private redisErrorsCount: { [error: string]: number } = {}

    private initialised = false

    connection: Redis | Cluster

    constructor() {
        this.connection = process.env.REDIS_MODE == 'CLUSTER' ? this.getRedisClusterConnection() : this.getRedisStandaloneConnection()
    }

    async init() {
        if (!this.initialised) {
            this.initialised = true
            const promise = new Promise<void>((resolve, reject) => {
                this.connection.on('connect', () => {
                    logger.debug('Redis connection established')
                    resetErrorsCount(this.redisErrorsCount)
                    resolve()
                })
                this.connection.on('error', (...args) => {
                    const err = args[0]
                    if (!this.redisErrorsCount[err.message]) {
                        this.redisErrorsCount[err.message] = 0
                    }
                    ++this.redisErrorsCount[err.message]
                    if (this.redisErrorsCount[err.message] > 5) {
                        logger.error(`Redis connection error: ${err.message}`)
                    }
                })
                this.connection.on('close', () => {
                    logger.debug('Redis connection closed')
                })
                this.connection.on('reconnecting', (delay: number) => {
                    logger.debug(`Redis reconnecting in ${delay}ms`)
                })
                this.connection.on('wait', () => {
                    logger.debug('Redis waiting')
                })
                this.connection.connect()
                    .then(() => resolve())
                    .catch(err => {
                        logger.error(`${err.message} Waiting for ${INITIALISATION_TIMEOUT}ms before rejecting.`)
                        setTimeout(() => {
                            if (this.connection.status != 'connect') {
                                reject({ error: 'Could not connect to redis', ...this.redisErrorsCount })
                            }
                        }, INITIALISATION_TIMEOUT)
                    })
            })
            return promise
        }
    }

    close() {
        this.connection.disconnect()
    }

    getRedisClusterConnection() {
        if (!process.env.REDIS_NODES) {
            throw new Error('Please provide valid REDIS_NODES')
        }
        const REDIS_NODES = JSON.parse(process.env.REDIS_NODES)
        const redisOptions: ClusterOptions = {
            ...BASIC_REDIS_OPTIONS,
            lazyConnect: true,
            clusterRetryStrategy: (times, reason) => {
                logger.debug(`Retry reason ${reason}`)
                return Math.min(100 * times, 5000)
            }
        }
        return new Cluster(REDIS_NODES, redisOptions)
    }

    getRedisStandaloneConnection() {
        if (!process.env.REDIS_NODE) {
            throw new Error('Please provide valid REDIS_NODE')
        }
        const { host, port, password } = JSON.parse(process.env.REDIS_NODE)
        const redisOptions: RedisOptions = {
            password, ...BASIC_REDIS_OPTIONS,
            lazyConnect: true,
            retryStrategy: (times) => Math.min(100 * times, 500),
        }
        return new Redis(port, host, redisOptions)
    }

    async getSearchKeyCount(searchKey: string) {
        try {
            const value = await this.connection.get(searchKey)
            return value == null ? null : +value
        } catch (err: unknown) {
            logError(err, 'getSearchKeyCount')
            throw err
        }
    }

    async updateSearchKeyCount(searchKey: string, count: number) {
        try {
            return await this.connection.set(searchKey, count, 'EX', SEARCH_KEY_CACHE_EXPIRY, 'NX')
        } catch (err: unknown) {
            logError(err, 'updateSearchKeyCount')
            throw err
        }
    }

    async bulkUpdateSearchKeyCount(requests: { searchKey: string, count: number }[]) {
        try {
            const promises = requests.map(({ searchKey, count }) => this.updateSearchKeyCount(searchKey, count))
            await Promise.all(promises)
        } catch (err: unknown) {
            logError(err, 'bulkUpdateSearchKeyCount')
            throw err
        }
    }

    async increaseSearchKeyCount(searchKey: string, count: number = 1) {
        try {
            return await this.connection.incrby(searchKey, count)
        } catch (err: unknown) {
            logError(err, 'increaseSearchKeyCount')
            throw err
        }
    }

    async bulkIncreaseSearchKeyCount(requests: { [searchKey: string]: number }) {
        try {
            const promises = Object.keys(requests).map(searchKey => this.increaseSearchKeyCount(searchKey, requests[searchKey]))
            await Promise.all(promises)
        } catch (err: unknown) {
            logError(err, 'bulkIncreaseSearchKeyCount')
            throw err
        }
    }
}

export default new RedisClient()
