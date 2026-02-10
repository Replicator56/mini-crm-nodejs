import { Appointment, Client, User } from '../models/index.js';

export const listAppointments = async (req, res) => {
  const appointments = await Appointment.findAll({
    include: [{ model: Client }, { model: User }],
    order: [['datetime', 'ASC']],
  });
  res.render('appointments', { appointments });
};

export const showAppointmentForm = async (req, res) => {
  const clients = await Client.findAll({ order: [['name', 'ASC']] });

  if (req.params.id) {
    const appointment = await Appointment.findByPk(req.params.id, {
      include: [{ model: Client }, { model: User }],
    });
    return res.render('appointment_form', { appointment, clients });
  }

  res.render('appointment_form', { appointment: null, clients });
};

export const createAppointment = async (req, res) => {
  const userId = req.session?.userId ?? null;
  if (!userId) {
    req.flash('error', 'Vous devez être connecté pour créer un rendez-vous.');
    return res.redirect('/login');
  }

  const { date, time, notes } = req.body;
  const rawClientIds = req.body.clientIds ?? req.body.clientId ?? [];
  const clientIds = Array.isArray(rawClientIds) ? rawClientIds : [rawClientIds];

  const datetime = new Date(`${date}T${time}`);

  const appointment = await Appointment.create({ userId, datetime, notes });
  await appointment.setClients(clientIds.filter(Boolean));

  req.flash('success', 'Rendez-vous ajouté.');
  res.redirect('/appointments');
};

export const updateAppointment = async (req, res) => {
  const { date, time, notes } = req.body;

  const rawClientIds = req.body.clientIds ?? req.body.clientId ?? [];
  const clientIds = Array.isArray(rawClientIds) ? rawClientIds : [rawClientIds];

  const datetime = new Date(`${date}T${time}`);

  const appointment = await Appointment.findByPk(req.params.id);
  if (!appointment) {
    req.flash('error', 'Rendez-vous introuvable.');
    return res.redirect('/appointments');
  }

  await appointment.update({ datetime, notes });
  await appointment.setClients(clientIds.filter(Boolean));

  req.flash('success', 'Rendez-vous mis à jour.');
  res.redirect('/appointments');
};

export const deleteAppointment = async (req, res) => {
  const appointment = await Appointment.findByPk(req.params.id);
  if (appointment) {
    // optionnel mais “propre” : nettoie la jointure avant destroy
    await appointment.setClients([]);
    await appointment.destroy();
  }

  req.flash('success', 'Rendez-vous supprimé.');
  res.redirect('/appointments');
};
