import { Cluster, ClusterOptions, Redis, RedisOptions } from "ioredis"
import { SEARCH_KEY_CACHE_EXPIRY } from "../constant/kognitos-counters.constant"
import logger from "../../logger"

const CONNECTION_TIMEOUT = 50 * 1000
const COMMAND_TIMEOUT = 500
const BASIC_REDIS_OPTIONS: RedisOptions = {
    connectTimeout: CONNECTION_TIMEOUT,
    commandTimeout: COMMAND_TIMEOUT
}

const redisErrorsCount: { [error: string]: number } = {}

const resetErrorsCount = () => Object.keys(redisErrorsCount).forEach(e => { redisErrorsCount[e] = 0 })

export class RedisClient {
    static initialised = false
    static connection: Cluster | Redis

    static async init() {
        if (!RedisClient.initialised || process.env.REDIS_NO_REUSE_CONNECTION) {
            try {
                process.env.REDIS_MODE == "CLUSTER" ? RedisClient.initRedisCluster() : RedisClient.initRedisStandalone()
                return new Promise((resolve, reject) => {
                    RedisClient.connection.on("connect", (err) => {
                        logger.info("Redis connection established")
                        resetErrorsCount()
                        if (!RedisClient.initialised) {
                            RedisClient.initialised = true
                            resolve(undefined)
                        }
                    })
                    RedisClient.connection.on("error", (err) => {
                        if (!redisErrorsCount[err.message]) {
                            redisErrorsCount[err.message] = 0
                        }
                        ++redisErrorsCount[err.message]
                        logger.error(`[${redisErrorsCount[err.message]}] - Redis connection error ${err.message}`)
                    })
                    RedisClient.connection.on("reconnecting", (delay: number) => {
                        logger.info(`Redis reconnecting ${delay}`)
                    })
                })
            } catch (err) {
                logger.error("Error initialising connection to redis", err)
                throw err
            }
        }
    }

    static initRedisCluster() {
        if (!process.env.REDIS_NODES) {
            throw new Error("Please provide valid REDIS_NODES")
        }
        const REDIS_NODES = JSON.parse(process.env.REDIS_NODES)
        const redisOptions: ClusterOptions = { ...BASIC_REDIS_OPTIONS }
        RedisClient.connection = new Cluster(REDIS_NODES, { redisOptions })
    }

    static initRedisStandalone() {
        if (!process.env.REDIS_NODE) {
            throw new Error("Please provide valid REDIS_NODE")
        }
        const { host, port, password } = JSON.parse(process.env.REDIS_NODE)
        const redisOptions: RedisOptions = {
            password, ...BASIC_REDIS_OPTIONS,
            retryStrategy: (times) => Math.min(100 * times, 5000),
        }
        RedisClient.connection = new Redis(port, host, redisOptions)
    }

    static async getSearchKeyCount(searchKey: string) {
        try {
            const value = await RedisClient.connection.get(searchKey)
            return value == null ? null : +value
        } catch (err) {
            logger.error("Error in getSearchKeyCount", err)
            throw err
        }
    }

    static async updateSearchKeyCount(searchKey: string, count: number) {
        try {
            return await RedisClient.connection.set(searchKey, count, "EX", SEARCH_KEY_CACHE_EXPIRY, "NX")
        } catch (err) {
            logger.error("Error in updateSearchKeyCount", err)
            throw err
        }
    }

    static async bulkUpdateSearchKeyCount(requests: { searchKey: string, count: number }[]) {
        try {
            const promises = requests.map(({ searchKey, count }) => RedisClient.updateSearchKeyCount(searchKey, count))
            await Promise.all(promises)
        } catch (err) {
            logger.error("Error in bulkUpdateSearchKeyCount", err)
            throw err
        }
    }

    static async increaseSearchKeyCount(searchKey: string, count: number = 1) {
        try {
            return await RedisClient.connection.incrby(searchKey, count)
        } catch (err) {
            logger.error("Error in increaseSearchKeyCount", err)
            throw err
        }
    }

    static async bulkIncreaseSearchKeyCount(requests: { [searchKey: string]: number }) {
        try {
            const promises = Object.keys(requests).map(searchKey => RedisClient.increaseSearchKeyCount(searchKey, requests[searchKey]))
            await Promise.all(promises)
        } catch (err) {
            logger.error("Error in bulkIncreaseSearchKeyCount", err)
            throw err
        }
    }
}