import { logError } from './common/util/error-handler.util'

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { randomUUID } from 'crypto'
import { MAX_WORD_LENGTH } from './common/constant/kognitos-counters.constant'
import { updateSeachKeyCache } from './common/helper/cache-refresh-helper'
import { RedisClient } from './common/redis'
import { SqsMessageBody, pushToSqs } from './common/sqs/sqs'

class InvalidRequestException extends Error {
    constructor(message: string) {
        super(message)
    }
}

function getWordFromRequest(event: APIGatewayProxyEvent): string {
    const { queryStringParameters } = event
    const originalWord = queryStringParameters ? queryStringParameters['word'] : undefined
    if (originalWord == undefined || originalWord.length == 0) {
        throw new InvalidRequestException('Invalid word. Should have at least 1 character.')
    } else if (originalWord.length > MAX_WORD_LENGTH) {
        throw new InvalidRequestException(`Invalid word. Should have at max ${MAX_WORD_LENGTH} characters.`)
    }
    return originalWord
}

function handleErrorResponse(error: unknown) {
    if (error instanceof InvalidRequestException) {
        return { statusCode: 400, body: JSON.stringify({ errorMessage: error.message }) }
    }
    return { statusCode: 500, body: JSON.stringify({ message: 'Something went wrong, please try again.' }) }
}

export const handlerV1 = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    let sqsMessageBody
    const redis = new RedisClient()
    try {
        const originalWord: string = getWordFromRequest(event)
        const requestId = randomUUID()
        const searchKey = `v1_${originalWord}`
        sqsMessageBody = { requestId, originalWord, searchKey }
        await redis.init()
        const occurrences = await redis.increaseSearchKeyCount(searchKey)
        return {
            statusCode: 200,
            body: JSON.stringify({ occurrences })
        }
    } catch (err: unknown) {
        logError(err, 'handlerV1')
        return handleErrorResponse(err)
    } finally {
        redis.close()
        if (sqsMessageBody) {
            await pushToSqs(sqsMessageBody)
        }
    }
}

export const handlerV2 = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    let sqsMessageBody
    const redis = new RedisClient()
    try {
        const originalWord: string = getWordFromRequest(event)
        const requestId = event.requestContext.requestId
        const searchKey = `v2:${originalWord}`
        sqsMessageBody = { requestId, originalWord, searchKey }
        await redis.init()
        let occurrences = await redis.getSearchKeyCount(searchKey)
        if (occurrences == null) {
            occurrences = await updateSeachKeyCache(searchKey)
        }
        // Increment occurrences by 1 to consider current count, which will get updated asynchronously
        ++occurrences
        return { statusCode: 200, body: JSON.stringify({ occurrences }) }
    } catch (err: unknown) {
        logError(err, 'handlerV2')
        return handleErrorResponse(err)
    } finally {
        redis.close()
        if (sqsMessageBody != null) {
            await pushToSqs(sqsMessageBody)
        }
    }
}

export const handlerV3 = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    let sqsMessageBody: SqsMessageBody | null = null
    const redis = new RedisClient()
    try {
        const originalWord: string = getWordFromRequest(event)
        const requestId = event.requestContext.requestId
        const searchKey = `v3:${originalWord}`
        sqsMessageBody = { requestId, originalWord, searchKey, refreshCache: true }
        await redis.init()
        let occurrences = await redis.getSearchKeyCount(searchKey)
        if (occurrences == null) {
            occurrences = 0
        }
        // Increment occurrences by 1 to consider current count, which will get updated asynchronously
        ++occurrences
        return { statusCode: 200, body: JSON.stringify({ occurrences }) }
    } catch (err: unknown) {
        logError(err, 'handlerV3')
        return handleErrorResponse(err)
    } finally {
        redis.close()
        if (sqsMessageBody != null) {
            await pushToSqs(sqsMessageBody)
        }
    }
}
