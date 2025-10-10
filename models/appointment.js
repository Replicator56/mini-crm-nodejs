// Appointment.js
export default (sequelize, DataTypes) => {
    return sequelize.define('Appointment', {
        datetime: {
            type: DataTypes.DATE,
            allowNull: false
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    });
};
