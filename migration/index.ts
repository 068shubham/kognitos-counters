import 'dotenv/config'
import logger from '../src/logger';

import { Liquibase, LiquibaseConfig, LiquibaseLogLevels, POSTGRESQL_DEFAULT_CONFIG } from 'liquibase'

if (!process.env.POSTGRES_CONFIG) {
    throw new Error("Please provide valid POSTGRES_CONFIG")
}

const { host, port, database, password, username, ssl = true } = JSON.parse(process.env.POSTGRES_CONFIG)

const myConfig: LiquibaseConfig = {
    ...POSTGRESQL_DEFAULT_CONFIG,
    url: `jdbc:postgresql://${host}:${port}/${database}${ssl ? '?sslmode=require' : ''}`,
    username: username,
    password: password,
    logLevel: LiquibaseLogLevels.Off,
    changeLogFile: './migration/postgres/main-changelog.xml'
}
const instance = new Liquibase(myConfig)

const actions: { [action: string]: () => Promise<any> } = {
    status: async () => await instance.status(),
    migration: async () => await instance.update({ labels: "main_tables" }),
    rollback: async () => await instance.rollbackToDate({ date: "2023-01-01T00:00:00" }),
    rollbackToTag: async () => await instance.rollback({ tag: process.argv[3] }),
}
const action = process.argv[2]
if (actions[action]) {
    logger.info(`running ${action}`)
    actions[action]()
        .then((res: any) => logger.info(`${action} completed`, res))
        .catch((err: any) => logger.error(`${action} failed`, err))
} else {
    logger.error(`Invalid action ${action}`)
}