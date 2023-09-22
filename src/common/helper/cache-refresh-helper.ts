import databaseManager from '../database';
import { AggregateWordCounts } from '../database/model/aggregate-word-counts.model';
import redis from '../redis';
import { logError } from '../util/error-handler.util';

export async function updateSeachKeyCache(searchKey: string, ttl: number): Promise<number> {
    try {
        await databaseManager.init();
        const aggregate = await AggregateWordCounts.findOne({ where: { searchKey } })
        const count = aggregate ? +aggregate.count : 0
        await redis.updateSearchKeyCount(searchKey, count, ttl)
        return count
    } catch (err: unknown) {
        logError(err, 'updateSeachKeyCache')
        throw err
    }
}

export async function bulkUpdateSeachKeyCache(searchKeys: string[], ttl: number): Promise<number[]> {
    try {
        await databaseManager.init();
        const promises = searchKeys.map(sk => updateSeachKeyCache(sk, ttl))
        return await Promise.all(promises)
    } catch (err: unknown) {
        logError(err, 'bulkUpdateSeachKeyCache')
        throw err
    }
}
