import { Appointment, Client } from '../models/index.js';

export const listAppointments = async (req, res) => {
    const appointments = await Appointment.findAll({
        include: Client,
        order: [['datetime', 'ASC']],
    });
    res.render('appointments', { appointments });
};

export const showAppointmentForm = async (req, res) => {
    const clients = await Client.findAll({ order: [['name', 'ASC']] });
    if (req.params.id) {
        const appointment = await Appointment.findByPk(req.params.id);
        return res.render('appointment_form', { appointment, clients });
    }
    res.render('appointment_form', { appointment: null, clients });
};

export const createAppointment = async (req, res) => {
    const { clientId, date, time, notes } = req.body;
    const datetime = new Date(`${date}T${time}`);
    await Appointment.create({ clientId, datetime, notes });
    req.flash('success', 'Rendez-vous ajouté.');
    res.redirect('/appointments');
};

export const updateAppointment = async (req, res) => {
    const { clientId, date, time, notes } = req.body;
    const datetime = new Date(`${date}T${time}`);
    await Appointment.update(
        { clientId, datetime, notes },
        { where: { id: req.params.id } }
    );
    req.flash('success', 'Rendez-vous mis à jour.');
    res.redirect('/appointments');
};

export const deleteAppointment = async (req, res) => {
    await Appointment.destroy({ where: { id: req.params.id } });
    req.flash('success', 'Rendez-vous supprimé.');
    res.redirect('/appointments');
};
