import { createLogger, format, transports } from 'winston'
import { FileTransportInstance, Transports } from 'winston/lib/winston/transports'

const loggingFormat = format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSSZ" }),
    format.json(),
)

const activeTransports: FileTransportInstance[] = []
const logger = createLogger({
    level: 'info',
    format: loggingFormat
})

if (process.env.ENABLE_FILE_LOGS) {
    logger.add(new transports.File({ filename: 'logs/error.log', level: 'error' }))
    logger.add(new transports.File({ filename: 'logs/info.log', level: 'info' }))
}

if (process.env.DISABLE_CONSOLE_LOGS !== 'true') {
    logger.add(new transports.Console({
        format: loggingFormat,
    }))
}

export default logger