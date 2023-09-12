import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs"

const queueUrl = process.env.SQS_QUEUE_URL
if (queueUrl == null) {
  throw new Error('SQS_QUEUE_URL not valid')
}
const sqsClient = new SQSClient({ region: "us-west-2" })

export type SqsMessageBody = { requestId: string, originalWord: string, searchKey: string }

export class SqsClient {
    static async pushToSqs(sqsMessageBody: SqsMessageBody) {
        const message = new SendMessageCommand({
            QueueUrl: queueUrl,
            MessageBody: JSON.stringify(sqsMessageBody)
        })
        await sqsClient.send(message)
    }
}