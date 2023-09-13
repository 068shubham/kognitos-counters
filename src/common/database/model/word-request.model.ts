import { DataTypes, Model } from 'sequelize'
import databaseManager from '..'

export class WordRequest extends Model {
    declare id: number
    declare requestId: string
    declare originalWord: string
    declare searchKey: string
    declare createdAt: Date
}

WordRequest.init({
    id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
    },
    requestId: {
        field: 'request_id',
        type: DataTypes.UUID,
        unique: true
    },
    originalWord: {
        field: 'original_word',
        type: DataTypes.STRING
    },
    searchKey: {
        field: 'search_key',
        type: DataTypes.STRING
    },
    createdOn: {
        field: 'created_on',
        type: DataTypes.DATE
    }
}, {
    tableName: 'kognitos_words',
    sequelize: databaseManager.connection,
    createdAt: 'created_on',
    updatedAt: false
})
