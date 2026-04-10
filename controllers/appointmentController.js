import { Appointment, Client, User } from '../models/index.js';

function normalizeClientIds(rawClientIds) {
  const clientIds = Array.isArray(rawClientIds) ? rawClientIds : [rawClientIds];
  return clientIds
    .filter(Boolean)
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id > 0);
}

function buildAppointmentDateTime(date, time) {
  if (!date || !time) return null;

  const datetime = new Date(`${date}T${time}`);
  if (Number.isNaN(datetime.getTime())) return null;

  return datetime;
}

function isPastDateTime(datetime) {
  return datetime.getTime() < Date.now();
}

function getSequelizeErrorMessage(err, fallbackMessage) {
  if (err?.name === 'SequelizeValidationError' && Array.isArray(err.errors) && err.errors.length > 0) {
    return err.errors.map((e) => e.message).join(' ');
  }

  return fallbackMessage;
}

export const listAppointments = async (req, res, next) => {
  try {
    const appointments = await Appointment.findAll({
      include: [{ model: Client }, { model: User }],
      order: [['datetime', 'ASC']],
    });

    res.render('appointments', { appointments });
  } catch (err) {
    next(err);
  }
};

export const showAppointmentForm = async (req, res, next) => {
  try {
    const clients = await Client.findAll({ order: [['name', 'ASC']] });

    if (req.params.id) {
      const appointment = req.appointment ?? await Appointment.findByPk(req.params.id, {
        include: [{ model: Client }, { model: User }],
      });

      if (!appointment) {
        req.flash('error', 'Rendez-vous introuvable.');
        return res.redirect('/appointments');
      }

      return res.render('appointment_form', { appointment, clients });
    }

    res.render('appointment_form', { appointment: null, clients });
  } catch (err) {
    next(err);
  }
};

export const createAppointment = async (req, res, next) => {
  try {
    const userId = req.session?.userId ?? null;

    if (!userId) {
      req.flash('error', 'Vous devez être connecté pour créer un rendez-vous.');
      return res.redirect('/login');
    }

    const { date, time, notes } = req.body;
    const rawClientIds = req.body.clientIds ?? req.body.clientId ?? [];
    const clientIds = normalizeClientIds(rawClientIds);

    if (!date || !time) {
      req.flash('error', 'La date et l’heure sont obligatoires.');
      return res.redirect('/appointments/new');
    }

    if (clientIds.length === 0) {
      req.flash('error', 'Vous devez sélectionner au moins un client.');
      return res.redirect('/appointments/new');
    }

    const datetime = buildAppointmentDateTime(date, time);

    if (!datetime) {
      req.flash('error', 'La date ou l’heure du rendez-vous est invalide.');
      return res.redirect('/appointments/new');
    }

    if (isPastDateTime(datetime)) {
      req.flash('error', 'Vous ne pouvez pas créer un rendez-vous dans le passé.');
      return res.redirect('/appointments/new');
    }

    const existingClients = await Client.findAll({
      where: { id: clientIds },
    });

    if (existingClients.length !== clientIds.length) {
      req.flash('error', 'Un ou plusieurs clients sélectionnés sont invalides.');
      return res.redirect('/appointments/new');
    }

    const appointment = await Appointment.create({
      userId,
      datetime,
      notes: notes?.trim() || null,
    });

    await appointment.setClients(clientIds);

    req.flash('success', 'Rendez-vous ajouté.');
    res.redirect('/appointments');
  } catch (err) {
    if (err?.name === 'SequelizeValidationError') {
      req.flash('error', getSequelizeErrorMessage(err, 'Données invalides pour le rendez-vous.'));
      return res.redirect('/appointments/new');
    }

    next(err);
  }
};

export const updateAppointment = async (req, res, next) => {
  try {
    const { date, time, notes } = req.body;
    const rawClientIds = req.body.clientIds ?? req.body.clientId ?? [];
    const clientIds = normalizeClientIds(rawClientIds);

    const appointment = req.appointment ?? await Appointment.findByPk(req.params.id);

    if (!appointment) {
      req.flash('error', 'Rendez-vous introuvable.');
      return res.redirect('/appointments');
    }

    if (!date || !time) {
      req.flash('error', 'La date et l’heure sont obligatoires.');
      return res.redirect(`/appointments/${req.params.id}/edit`);
    }

    if (clientIds.length === 0) {
      req.flash('error', 'Vous devez sélectionner au moins un client.');
      return res.redirect(`/appointments/${req.params.id}/edit`);
    }

    const datetime = buildAppointmentDateTime(date, time);

    if (!datetime) {
      req.flash('error', 'La date ou l’heure du rendez-vous est invalide.');
      return res.redirect(`/appointments/${req.params.id}/edit`);
    }

    if (isPastDateTime(datetime)) {
      req.flash('error', 'Vous ne pouvez pas enregistrer un rendez-vous dans le passé.');
      return res.redirect(`/appointments/${req.params.id}/edit`);
    }

    const existingClients = await Client.findAll({
      where: { id: clientIds },
    });

    if (existingClients.length !== clientIds.length) {
      req.flash('error', 'Un ou plusieurs clients sélectionnés sont invalides.');
      return res.redirect(`/appointments/${req.params.id}/edit`);
    }

    await appointment.update({
      datetime,
      notes: notes?.trim() || null,
    });

    await appointment.setClients(clientIds);

    req.flash('success', 'Rendez-vous mis à jour.');
    res.redirect('/appointments');
  } catch (err) {
    if (err?.name === 'SequelizeValidationError') {
      req.flash('error', getSequelizeErrorMessage(err, 'Données invalides pour le rendez-vous.'));
      return res.redirect(`/appointments/${req.params.id}/edit`);
    }

    next(err);
  }
};

export const deleteAppointment = async (req, res, next) => {
  try {
    const appointment = req.appointment ?? await Appointment.findByPk(req.params.id);

    if (!appointment) {
      req.flash('error', 'Rendez-vous introuvable.');
      return res.redirect('/appointments');
    }

    await appointment.setClients([]);
    await appointment.destroy();

    req.flash('success', 'Rendez-vous supprimé.');
    res.redirect('/appointments');
  } catch (err) {
    next(err);
  }
};