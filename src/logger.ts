import { createLogger, format, transports } from 'winston'

export function getLogger(label?: string) {
    const defaultFormats = [
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSSZ' }),
        format.json()
    ]
    const loggingFormat = label ? format.combine(...defaultFormats, format.label({ label })) : format.combine(...defaultFormats)
    const logger = createLogger({ level: 'info', format: loggingFormat })
    if (process.env.ENABLE_FILE_LOGS) {
        logger.add(new transports.File({ filename: 'logs/error.log', level: 'error' }))
        logger.add(new transports.File({ filename: 'logs/info.log', level: 'info' }))
        logger.add(new transports.File({ filename: 'logs/debug.log', level: 'debug' }))
    }
    if (process.env.DISABLE_CONSOLE_LOGS !== 'true') {
        logger.add(new transports.Console({ format: loggingFormat }))
    }
    return logger
}

export default getLogger()
