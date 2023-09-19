import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs'

import { producer } from './common/kafka'

SQSClient.prototype.send = async (command: SendMessageCommand) => {
    await producer.send(command.input.MessageBody)
}
