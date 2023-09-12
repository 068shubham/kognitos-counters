import logger from '../../logger';
import { DatabaseManager } from '../database'
import { AggregateWordCounts } from '../database/model/aggregate-word-counts.model'
import { RedisClient } from '../redis'

export class CacheRefreshHelper {

    static async updateSeachKeyCache(searchKey: string, redisKey: string): Promise<number> {
        try {
            await DatabaseManager.init();
            const aggregate = await AggregateWordCounts.findOne({ where: { searchKey } })
            const count = aggregate ? +aggregate.count : 0
            await RedisClient.updateSearchKeyCount(redisKey, count)
            return count
        } catch (err: unknown) {
            logger.error("Error whiling refreshing cache", err)
            throw err
        }
    }

}