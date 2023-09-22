import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs'

import { producer } from './common/kafka'
import { KOGNITOS_COUNTERS_USER_INPUT_TOPIC_V1, KOGNITOS_COUNTERS_USER_INPUT_TOPIC_V2, KOGNITOS_COUNTERS_USER_INPUT_TOPIC_V3 } from './common/constant/kognitos-counters.constant'

type KeyValueObject<T = any> = { [key: string]: T }

const MESSAGE_VERSION_TO_TOPIC_MAP: KeyValueObject<string> = {
    'v1': KOGNITOS_COUNTERS_USER_INPUT_TOPIC_V1,
    'v2': KOGNITOS_COUNTERS_USER_INPUT_TOPIC_V2,
    'v3': KOGNITOS_COUNTERS_USER_INPUT_TOPIC_V3
}

SQSClient.prototype.send = async (command: SendMessageCommand) => {
    const version = command.input?.MessageAttributes?.['version']?.StringValue || 'default'
    const topic = MESSAGE_VERSION_TO_TOPIC_MAP[version]
    if (topic) {
        await producer.send(topic, command.input.MessageBody)
    }
}
