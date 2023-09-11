import { Cluster, Redis } from "ioredis"

const CONNECTION_TIMEOUT = 5 * 1000
const COMMAND_TIMEOUT = 500
const REDIS_OPTIONS = { lazyConnect: true, connectTimeout: CONNECTION_TIMEOUT, commandTimeout: COMMAND_TIMEOUT, maxRetriesPerRequest: 1 }

export class RedisClient {
    static connection: Cluster | Redis

    static async init() {
        try {
            if (process.env.REDIS_MODE == "CLUSTER") {
                if (!process.env.REDIS_NODES) {
                    throw new Error("Please provide valid REDIS_NODES")
                }
                try {
                    const REDIS_NODES = JSON.parse(process.env.REDIS_NODES)
                    RedisClient.connection = new Cluster(REDIS_NODES, { redisOptions: REDIS_OPTIONS, lazyConnect: REDIS_OPTIONS.lazyConnect })
                } catch (err) {
                    console.error("Error while creating redis client", err)
                    throw err
                }
            } else {
                if (!process.env.REDIS_NODE) {
                    throw new Error("Please provide valid REDIS_NODE")
                }
                const { host, port, password } = JSON.parse(process.env.REDIS_NODE)
                RedisClient.connection = new Redis(port, host, { ...REDIS_OPTIONS, password })
            }
            RedisClient.connection.on("error", (err) => {
                console.error("Redis connection error", err.message)
            })
            await RedisClient.connection.connect()
        } catch (err) {
            console.error("Error while connecting to redis", err)
            throw err
        }
    }

    static async getSearchKeyCount(searchKey: string) {
        try {
            return await RedisClient.connection.get(searchKey)
        } catch (err) {
            console.error("Error while getting searchKeyCount", err)
            throw err
        }
    }

    static async increaseSearchKeyCount(searchKey: string) {
        try {
            return await RedisClient.connection.incr(searchKey)
        } catch (err) {
            console.error("Error while getting searchKeyCount", err)
            throw err
        }
    }
}