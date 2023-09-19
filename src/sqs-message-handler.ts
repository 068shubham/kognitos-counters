import logger from './logger'

import { ValidationError } from 'sequelize'
import { DatabaseManager } from './common/database'
import { WordRequest } from './common/database/model/word-request.model'
import { bulkUpdateSeachKeyCache } from './common/helper/cache-refresh-helper'
import { SqsMessageBody } from './common/sqs/sqs'

interface SqsMessage { messageId: string, body: SqsMessageBody }

async function handlerError(requests: SqsMessage[], err: unknown) {
    let retryMessageIds;
    if (err instanceof ValidationError && err.name == 'SequelizeUniqueConstraintError') {
        const existingRequestIds = (await WordRequest.findAll({
            where: { requestId: requests.map(({ body }) => body.requestId) },
            attributes: ['requestId']
        })).map(({ requestId }) => requestId)
        retryMessageIds = requests.filter(({ body }) => existingRequestIds.indexOf(body.requestId) == -1).map(r => r.messageId)
    } else {
        logger.error('Unknown error in sqs handler', err)
        retryMessageIds = requests.map(r => r.messageId);
    }
    return { batchItemFailures: retryMessageIds.map(messageId => ({ itemIdentifier: messageId })) }
}

export const handler = async ({ Records }: { Records: { messageId: string, body: any }[] }) => {
    const databaseManager = new DatabaseManager()
    const requests: SqsMessage[] = Records.map(({ messageId, body }) => ({ messageId, body: JSON.parse(body) }))
    try {
        await databaseManager.init()
        const inserts = requests.map(({ body: { requestId, originalWord, searchKey } }) => ({ requestId, originalWord, searchKey }))
        await WordRequest.bulkCreate(inserts)
        return {
            batchItemFailures: []
        }
    } catch (err: unknown) {
        return await handlerError(requests, err)
    } finally {
        const searchKeys = requests.map(r => r.body).filter(b => b.refreshCache).map(r => r.searchKey)
        await bulkUpdateSeachKeyCache(searchKeys)
        databaseManager.close()
    }
}
