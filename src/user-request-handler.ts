import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda"
import { randomUUID } from "crypto"
import { MAX_WORD_LENGTH } from "./common/constant/kognitos-counters.constant"
import { CacheRefreshHelper } from "./common/helper/cache-refresh-helper"
import { RedisClient } from "./common/redis"
import { SqsClient, SqsMessageBody } from "./common/sqs/sqs"
import logger from './logger'

export const handlerV1 = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const { queryStringParameters } = event
        const originalWord = queryStringParameters ? queryStringParameters['word'] : undefined
        if (originalWord == undefined || originalWord.length == 0) {
            console.warn("Invalid word provided")
            return { statusCode: 400, body: JSON.stringify({ message: "Invalid word" }) }
        }
        const requestId = randomUUID()
        const searchKey = originalWord.toLocaleLowerCase().split("").sort().join("")
        const sqsMessageBody = { requestId, originalWord, searchKey }
        await SqsClient.pushToSqs(sqsMessageBody)
        await RedisClient.init()
        const occurrences = await RedisClient.increaseSearchKeyCount(searchKey)
        return {
            statusCode: 200,
            body: JSON.stringify({ occurrences })
        }
    } catch (err) {
        console.error("Errow while proccessing", err)
        return { statusCode: 500, body: JSON.stringify({ message: "Something went wrong, please try again." }) }
    }
}

export const handlerV2 = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    let sqsMessageBody: SqsMessageBody | null = null
    try {
        const { queryStringParameters } = event
        const originalWord = queryStringParameters ? queryStringParameters['word'] : undefined
        if (originalWord == undefined || originalWord.length == 0 || originalWord.length > MAX_WORD_LENGTH) {
            logger.warn(`Invalid word provided: ${originalWord}`)
            return { statusCode: 400, body: JSON.stringify({ message: "Invalid word" }) }
        }
        const requestId = event.requestContext.requestId
        const searchKey = originalWord.toLocaleLowerCase().split("").sort().join("")
        sqsMessageBody = { requestId, originalWord, searchKey }
        await RedisClient.init()
        let occurrences = await RedisClient.getSearchKeyCount(searchKey)
        if (occurrences == null) {
            occurrences = await CacheRefreshHelper.updateSeachKeyCache(searchKey)
        }
        // Increment occurrences by 1 to consider current count, which will get updated asynchronously
        ++occurrences
        return { statusCode: 200, body: JSON.stringify({ occurrences }) }
    } catch (err) {
        logger.error("Errow while proccessing", err)
        return { statusCode: 500, body: JSON.stringify({ message: "Something went wrong, please try again." }) }
    } finally {
        if (sqsMessageBody != null) {
            await SqsClient.pushToSqs(sqsMessageBody)
        }
    }
}