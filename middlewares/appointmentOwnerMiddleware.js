import { Appointment, Client, User } from '../models/index.js';

export async function ensureAppointmentOwner(req, res, next) {
  try {
    const userId = req.session?.user?.id ?? null;

    if (!userId) {
      req.flash('error', 'Veuillez vous connecter.');
      return res.redirect('/login');
    }

    const appointment = await Appointment.findByPk(req.params.id, {
      include: [{ model: Client }, { model: User }],
    });

    if (!appointment) {
      req.flash('error', 'Rendez-vous introuvable.');
      return res.redirect('/appointments');
    }

    if (Number(appointment.userId) !== Number(userId)) {
      req.flash('error', 'Accès refusé : vous n’êtes pas le responsable de ce rendez-vous.');
      return res.redirect('/appointments');
    }

    req.appointment = appointment;
    return next();
  } catch (err) {
    return next(err);
  }
}