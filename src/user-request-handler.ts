import { randomUUID } from "crypto"
import { RedisClient } from "./common/redis"
import { SqsClient } from "./common/sqs/sqs"
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
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