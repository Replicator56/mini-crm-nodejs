import 'dotenv/config';
import { sequelize, User, Client, Appointment } from './models/index.js';
import bcrypt from 'bcrypt';

(async () => {
    try {
        // Réinitialisation des tables
        await sequelize.sync({ force: true });
        console.log('Tables réinitialisées');

        // --- Création des utilisateurs ---
        const passwordHash = await bcrypt.hash('password123', 10);
        const users = await User.bulkCreate([
            { name: 'Alice Admin', email: 'alice@example.com', password: passwordHash },
            { name: 'Bob Manager', email: 'bob@example.com', password: passwordHash },
            { name: 'Charlie Staff', email: 'charlie@example.com', password: passwordHash },
            { name: 'David Staff', email: 'david@example.com', password: passwordHash },
            { name: 'Eve Manager', email: 'eve@example.com', password: passwordHash }
        ]);

        // --- Création des clients ---
        const clientsData = [
            { name: 'Alice Dupont', email: 'alice.dupont@example.com', phone: '0601020304', notes: 'Client régulier' },
            { name: 'Bob Martin', email: 'bob.martin@example.com', phone: '0605060708', notes: '' },
            { name: 'Charlie Durand', email: 'charlie.durand@example.com', phone: '0608091011', notes: 'À relancer' },
            { name: 'David Leroy', email: 'david.leroy@example.com', phone: '0611121314', notes: '' },
            { name: 'Eve Bernard', email: 'eve.bernard@example.com', phone: '0615161718', notes: 'Client régulier' },
            { name: 'François Petit', email: 'francois.petit@example.com', phone: '0619202122', notes: '' },
            { name: 'Géraldine Moreau', email: 'geraldine.moreau@example.com', phone: '0623242526', notes: 'À relancer' },
            { name: 'Hugo Robert', email: 'hugo.robert@example.com', phone: '0627282930', notes: '' },
            { name: 'Isabelle Fabre', email: 'isabelle.fabre@example.com', phone: '0631323334', notes: '' },
            { name: 'Julien Marchand', email: 'julien.marchand@example.com', phone: '0635363738', notes: 'Client régulier' }
        ];
        const clients = await Client.bulkCreate(clientsData);

        // --- Création des rendez-vous ---
        const appointmentsData = [];
        const startDate = new Date();
        const hoursOptions = [9, 10, 11, 14, 15, 16];

        for (let i = 0; i < 20; i++) {
            const clientIndex = i % clients.length;
            const userIndex = i % users.length;
            const dayOffset = Math.floor(i / hoursOptions.length);
            const hourIndex = i % hoursOptions.length;
            const appointmentDate = new Date(startDate);
            appointmentDate.setDate(startDate.getDate() + dayOffset);
            appointmentDate.setHours(hoursOptions[hourIndex], 0, 0, 0);

            appointmentsData.push({
                clientId: clients[clientIndex].id,
                userId: users[userIndex].id,
                datetime: appointmentDate,
                notes: `RDV #${i + 1} avec ${clients[clientIndex].name}`
            });
        }

        await Appointment.bulkCreate(appointmentsData);

        console.log('Seed complet terminé avec succès ! ✅');
        process.exit(0);
    } catch (err) {
        console.error('Erreur lors du seed:', err);
        process.exit(1);
    }
})();
