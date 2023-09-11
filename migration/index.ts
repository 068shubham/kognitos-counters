import 'dotenv/config';

import { Liquibase, LiquibaseConfig, POSTGRESQL_DEFAULT_CONFIG } from 'liquibase';

if (!process.env.POSTGRES_CONFIG) {
    throw new Error("Please provide valid POSTGRES_CONFIG")
}

const { host, port, database, password, username, connectionTimeout = 10000, ssl = true } = JSON.parse(process.env.POSTGRES_CONFIG)

const myConfig: LiquibaseConfig = {
    ...POSTGRESQL_DEFAULT_CONFIG,
    url: `jdbc:postgresql://${host}:${port}/${database}${ssl ? '?sslmode=require' : ''}`,
    username: username,
    password: password,
    changeLogFile: './migration/postgres/main-changelog.xml'
}
const instance = new Liquibase(myConfig)

async function doEet() {
    // await instance.status()
    await instance.update({ labels: "main_tables" })
    // await instance.tag({ tag: "release_1" })
    // await instance.status()
    // await instance.rollback({tag: 'test_tables_1_release'})
    // await instance.dropAll()
}

doEet().then((res) => {
    console.log("Migration completed", res)
}).catch((err) => {
    console.error("Migration failed")
})