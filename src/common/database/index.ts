import { Sequelize } from "sequelize"
import logger from "../../logger"

if (!process.env.POSTGRES_CONFIG) {
    throw new Error("Please provide valid POSTGRES_CONFIG")
}
const { host, port, database, password, username, connectionTimeout = 10000, ssl = true } = JSON.parse(process.env.POSTGRES_CONFIG)

export class DatabaseManager {
    static initialised = false
    static connection: Sequelize = new Sequelize({
        dialect: 'postgres',
        host, port, database, username, password,
        ssl,
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
                    logger.error(`[${obj.$current}] - Database connection error: ${message}`)
                }
            },
        },
    })
    static async init() {
        if (!DatabaseManager.initialised) {
            await DatabaseManager.connection.authenticate()
            DatabaseManager.initialised = true
        }
    }
}