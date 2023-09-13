import { DataTypes, Model } from 'sequelize'
import databaseManager from '..'

export class AggregateWordCounts extends Model {
    declare id: number
    declare searchKey: string
    declare count: number
    declare createdOn: Date
    declare updatedOn: Date
}

AggregateWordCounts.init({
    id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
    },
    searchKey: {
        field: 'search_key',
        type: DataTypes.STRING,
        unique: true
    },
    count: {
        type: DataTypes.BIGINT,
    },
    createdOn: {
        field: 'created_on',
        type: DataTypes.DATE
    },
    updatedOn: {
        field: 'updated_on',
        type: DataTypes.DATE
    }
}, {
    tableName: 'kognitos_aggregate_word_counts',
    sequelize: databaseManager.connection,
    createdAt: 'created_on',
    updatedAt: 'updated_on'
})
