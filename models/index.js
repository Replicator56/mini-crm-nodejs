import 'dotenv/config';
import { Sequelize, DataTypes, Op } from 'sequelize';
import UserModel from './user.js';
import ClientModel from './client.js';
import AppointmentModel from './appointment.js';
import AppointmentClientModel from './appointmentClient.js';

const NODE_ENV = process.env.NODE_ENV || 'development';
const isTest = NODE_ENV === 'test';

let sequelize;

if (isTest) {
  // Base de données rapide pour les tests
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false,
  });
} else {
  // MSSQL pour dev / prod (Docker)
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 1433,
      dialect: 'mssql',
      dialectOptions: {
        options: {
          encrypt: process.env.DB_ENCRYPT === 'true',
          trustServerCertificate: true
        }
      },
      logging: false,
    }
  );
}

// Initialisation des modèles
const User = UserModel(sequelize, DataTypes);
const Client = ClientModel(sequelize, DataTypes);
const Appointment = AppointmentModel(sequelize, DataTypes);
const AppointmentClient = AppointmentClientModel(sequelize, DataTypes);

// Responsable (1-N)
User.hasMany(Appointment, { foreignKey: 'userId' });
Appointment.belongsTo(User, { foreignKey: 'userId' });

// Participants (N-N)
Client.belongsToMany(Appointment, {
  through: AppointmentClient,
  foreignKey: 'clientId',
  otherKey: 'appointmentId'
});

Appointment.belongsToMany(Client, {
  through: AppointmentClient,
  foreignKey: 'appointmentId',
  otherKey: 'clientId'
});

// Export
export { sequelize, Sequelize, Op, User, Client, Appointment,AppointmentClient };
