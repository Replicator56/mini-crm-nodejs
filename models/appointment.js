export default (sequelize, DataTypes) => {
  return sequelize.define('Appointment', {
    datetime: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        notNull: {
          msg: 'La date et l’heure du rendez-vous sont obligatoires.',
        },
        isDate: {
          msg: 'La date et l’heure du rendez-vous sont invalides.',
        },
        isFutureOrPresent(value) {
          if (!value) return;

          const appointmentDate = new Date(value);

          if (Number.isNaN(appointmentDate.getTime())) {
            throw new Error('La date et l’heure du rendez-vous sont invalides.');
          }

          if (appointmentDate.getTime() < Date.now()) {
            throw new Error('Vous ne pouvez pas enregistrer un rendez-vous dans le passé.');
          }
        },
      },
    },

    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        lenIfPresent(value) {
          if (value && value.length > 5000) {
            throw new Error('Les notes ne doivent pas dépasser 5000 caractères.');
          }
        },
      },
    },

    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        notNull: {
          msg: 'Le responsable du rendez-vous est obligatoire.',
        },
        isInt: {
          msg: 'Le responsable du rendez-vous est invalide.',
        },
        min: {
          args: [1],
          msg: 'Le responsable du rendez-vous est invalide.',
        },
      },
    },
  });
};