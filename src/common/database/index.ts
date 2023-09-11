import { Sequelize } from "sequelize"

if (!process.env.POSTGRES_CONFIG) {
    throw new Error("Please provide valid POSTGRES_CONFIG")
}
const { host, port, database, password, username, connectionTimeout = 10000, ssl = true } = JSON.parse(process.env.POSTGRES_CONFIG)

export class DatabaseManager {
    static connection: Sequelize = new Sequelize({
        dialect: 'postgres',
        host,
        port,
        database,
        username,
        password,
        ssl,
        dialectOptions: {
            ssl: ssl ? { require: true, rejectUnauthorized: false } : undefined,
            connectionTimeout
        },
        logging: false
    })
    static async init() {
        await DatabaseManager.connection.authenticate()
    }
}