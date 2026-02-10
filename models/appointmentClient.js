//AppointmentClient.js
export default (sequelize, DataTypes) => {
    return sequelize.define(
        'AppointmentClient',
        {
            clientId: {
                type: DataTypes.INTEGER,
                allowNull: false,
                primaryKey: true
            },
            appointmentId: {
                type: DataTypes.INTEGER,
                allowNull: false,
                primaryKey: true
            }
        },
        {
            tableName: 'AppointmentClients',
            timestamps: false,
            indexes: [
                {
                    unique: true,
                    fields: [
                        'clientId',
                        'appointmentId'
                    ]
                }
            ]
        });
};
