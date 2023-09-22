import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs'

const queueUrl = process.env.SQS_QUEUE_URL
if (queueUrl == null) {
    throw new Error('SQS_QUEUE_URL not valid')
}
const sqsClient = new SQSClient({ region: 'us-west-2' })

export interface SqsMessageBody { requestId: string, originalWord: string, searchKey: string, refreshCache?: boolean }

export async function pushToSqs(sqsMessageBody: SqsMessageBody, version: string) {
    const message = new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify(sqsMessageBody),
        MessageAttributes: { version: { StringValue: version, DataType: 'String' } }
    })
    await sqsClient.send(message)
}
