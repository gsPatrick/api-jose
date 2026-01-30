const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Client = sequelize.define('Client', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    whatsapp_number: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'novo', // 'novo', 'em_atendimento', 'finalizado'
    },
    current_session: {
        type: DataTypes.JSON,
        defaultValue: {},
    },
    farm_location: {
        type: DataTypes.JSON, // Can store string or complex object
        allowNull: true,
    },
}, {
    timestamps: true,
    tableName: 'Clients'
});

module.exports = Client;
