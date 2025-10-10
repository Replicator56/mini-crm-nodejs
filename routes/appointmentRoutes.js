import express from 'express';
import {
    listAppointments,
    showAppointmentForm,
    createAppointment,
    updateAppointment,
    deleteAppointment
} from '../controllers/appointmentController.js';
import { ensureAuthenticated } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', ensureAuthenticated, listAppointments);
router.get('/new', ensureAuthenticated, showAppointmentForm);
router.post('/', ensureAuthenticated, createAppointment);
router.get('/:id/edit', ensureAuthenticated, showAppointmentForm);
router.put('/:id', ensureAuthenticated, updateAppointment);
router.delete('/:id', ensureAuthenticated, deleteAppointment);

export default router;
