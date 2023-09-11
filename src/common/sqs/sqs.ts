import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs"

const queueUrl = process.env.SQS_QUEUE_URL
if (!queueUrl) {
    throw new Error("SQS_QUEUE_URL not valid")
}
const sqsClient = new SQSClient({ region: "us-west-2" })

export class SqsClient {
    static async pushToSqs(sqsMessageBody: { requestId: string, originalWord: string, searchKey: string }) {
        const message = new SendMessageCommand({
            QueueUrl: queueUrl,
            MessageBody: JSON.stringify(sqsMessageBody)
        })
        await sqsClient.send(message)
    }
}