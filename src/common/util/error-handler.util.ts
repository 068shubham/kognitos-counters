import logger from '../../logger'

export function logError(err: unknown, message: string) {
    if (err instanceof Error) {
        logger.error(`${message}: ${err.message}`)
    } else {
        logger.error(message, err)
    }
}
