import logger from './logger'

import { KOGNITOS_COUNTERS_USER_INPUT_TOPIC_V1, KOGNITOS_COUNTERS_USER_INPUT_TOPIC_V2, KOGNITOS_COUNTERS_USER_INPUT_TOPIC_V3 } from './common/constant/kognitos-counters.constant'
import { handlerV1 as sqsMessageHandlerV1, handlerV2 as sqsMessageHandlerV2, handlerV3 as sqsMessageHandlerV3 } from './sqs-message-handler'
import { EachBatchPayload } from 'kafkajs'

const resolvedOffSets = new Set()

type handlerType = (arg: { Records: { messageId: string, body: any }[] }) => Promise<{
    batchItemFailures: {
        itemIdentifier: string;
    }[];
}>

const TOPIC_TO_HANDLER_MAP: { [topic: string]: handlerType } = {
    [KOGNITOS_COUNTERS_USER_INPUT_TOPIC_V1]: sqsMessageHandlerV1,
    [KOGNITOS_COUNTERS_USER_INPUT_TOPIC_V2]: sqsMessageHandlerV2,
    [KOGNITOS_COUNTERS_USER_INPUT_TOPIC_V3]: sqsMessageHandlerV3
}

function getHandlerForTopic(topic: string) {
    if (TOPIC_TO_HANDLER_MAP[topic]) {
        return TOPIC_TO_HANDLER_MAP[topic]
    }
}

export const sqsMessageHandlerWrapper = async ({ batch: { topic, messages }, resolveOffset }: EachBatchPayload) => {
    logger.debug(`${messages.length} kafka messages received`, { topic })
    const handler = getHandlerForTopic(topic)
    if (!handler) {
        logger.warn(`No handler found for topic ${topic}`)
        return
    }
    const { batchItemFailures } = await handler({
        Records: messages
            .filter(({ value, offset }) => value !== null && !resolvedOffSets.has(offset))
            .map(m => ({
                body: m.value?.toString(),
                messageId: m.offset
            }))
    })
    if (batchItemFailures && batchItemFailures.length > 0) {
        const errorMessage = `${batchItemFailures.length} messages failed`
        logger.error(errorMessage)
        const failedOffSets = new Set()
        let minFailed = +batchItemFailures[0].itemIdentifier
        batchItemFailures.forEach(({ itemIdentifier }) => {
            minFailed = Math.min(minFailed, +itemIdentifier)
            failedOffSets.add(+itemIdentifier)
        })
        const offSetsToResolve = messages.filter(({ offset }) => !failedOffSets.has(+offset))
        offSetsToResolve.forEach(({ offset }) => resolvedOffSets.add(offset))
        offSetsToResolve.sort()
        let offSetToResolve = '-1'
        for (const { offset } of offSetsToResolve) {
            if (+offset >= minFailed) {
                break
            } else {
                offSetToResolve = offset
            }
        }
        if (offSetToResolve != '-1') {
            logger.info(`resolving ${offSetToResolve} offset`)
            resolveOffset(offSetToResolve)
        }
    } else {
        const offSetToResolve = messages.reduce((max, { offset }) => Math.max(max, +offset), 0)
        resolveOffset(`${offSetToResolve}`)
    }
}
