import 'dotenv/config';
import { Sequelize, DataTypes, Op } from 'sequelize';
import UserModel from './User.js';
import ClientModel from './Client.js';
import AppointmentModel from './Appointment.js';

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        dialect: 'mssql',
        dialectOptions: { options: { encrypt: true } },
        logging: false,
    }
);

// Initialisation des modèles
const User = UserModel(sequelize, DataTypes);
const Client = ClientModel(sequelize, DataTypes);
const Appointment = AppointmentModel(sequelize, DataTypes);

// Associations
Client.hasMany(Appointment, { foreignKey: 'clientId', onDelete: 'CASCADE' });
Appointment.belongsTo(Client, { foreignKey: 'clientId' });

// Export
export { sequelize, Sequelize, Op, User, Client, Appointment };
