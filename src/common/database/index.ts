import { ConnectionError, ConnectionTimedOutError, Sequelize } from 'sequelize'
import logger from '../../logger'

function getConnection() {
    if (!process.env.POSTGRES_CONFIG) {
        throw new Error('Please provide valid POSTGRES_CONFIG')
    }
    const { host, port, database, password, username, connectionTimeout = 10000, ssl = true } = JSON.parse(process.env.POSTGRES_CONFIG)
    return new Sequelize({
        dialect: 'postgres',
        host, port, database, username, password, ssl,
        dialectOptions: {
            ssl: ssl ? { require: true, rejectUnauthorized: false } : undefined,
            connectionTimeout
        },
        logging: false,
        retry: {
            max: 10,
            backoffBase: 1000,
            backoffExponent: 1.1,
            report(message, obj, err) {
                if (err) {
                    if (obj.$current > 5) {
                        logger.error(`[${obj.$current}] - Critical database error: ${message}`)
                    }
                }
            },
            match: [
                ConnectionError,
                ConnectionTimedOutError
            ]
        },
    })
}

export class DatabaseManager {

    private static singleton?: DatabaseManager = process.env.REUSE_REDIS_CONNECTION ? new DatabaseManager() : undefined

    private initialised = false

    connection: Sequelize

    private constructor() {
        this.connection = getConnection()
    }

    static getInstance() {
        if (DatabaseManager.singleton) {
            return DatabaseManager.singleton
        } else {
            return new DatabaseManager()
        }
    }

    async init() {
        if (!this.initialised) {
            await this.connection.authenticate()
            logger.info('Database connection initialised')
            this.initialised = true
        }
    }

    async close() {
        if (this != DatabaseManager.singleton) {
            await this.connection.close()
        }
    }

}

export default DatabaseManager.getInstance()
