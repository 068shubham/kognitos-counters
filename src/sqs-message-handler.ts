import { SQSEvent } from 'aws-lambda'
import { ValidationError } from 'sequelize'
import { DatabaseManager } from './common/database'
import { WordRequest } from './common/database/model/word-request.model'
import logger from './logger'

export const handler = async (event: SQSEvent) => {
    const requests = event.Records
        .map(({ messageId, body }) => ({ messageId, body: JSON.parse(body) }))
    try {
        await DatabaseManager.init()
        const inserts = requests.map(({ body: { requestId, originalWord, searchKey } }) => ({ requestId, originalWord, searchKey }))
        await WordRequest.bulkCreate(inserts)
        return {
            batchItemFailures: []
        }
    } catch (err: unknown) {
        let retryMessageIds;
        if (err instanceof ValidationError && err.name == 'SequelizeUniqueConstraintError') {
            const existingRequestIds = (await WordRequest.findAll({
                where: { requestId: requests.map(({ body }) => body.requestId) },
                attributes: ['requestId']
            })).map(({ requestId }) => requestId)
            retryMessageIds = requests.filter(({ body }) => existingRequestIds.indexOf(body.requestId) == -1).map(r => r.messageId)
        } else {
            logger.error("Unknown error in sqs handler", err)
            retryMessageIds = requests.map(r => r.messageId);
        }
        return { batchItemFailures: retryMessageIds.map(messageId => ({ itemIdentifier: messageId })) }
    }
}