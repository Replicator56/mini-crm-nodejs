import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import flash from 'connect-flash';
import bcrypt from 'bcrypt';
import methodOverride from 'method-override';
import path from 'path';
import { fileURLToPath } from 'url';
import expressLayouts from 'express-ejs-layouts';
import csrf from 'csurf';
import xss from 'xss';
import { sequelize, User, Client, Appointment, Op } from './models/index.js';

// --- __dirname pour ES Modules ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// --- Vérification qu'un SESSION_SECRET est défini dans le .env
if (!process.env.SESSION_SECRET || !process.env.SESSION_SECRET.trim()) {
  throw new Error(
    `La variable d'environnement SESSION_SECRET est obligatoire (env=${NODE_ENV}). 
Veuillez la définir dans votre fichier .env.`
  );
}

// --- Sécurité : Helmet + Rate limit ---
app.use(helmet());

// Limite globale
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
}));

// Limite spécifique login/register
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Trop de tentatives, réessayez dans 15 minutes.'
});

// --- Views & layouts ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// --- Body parsing + static + method override ---
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

// --- Trust proxy (pour production HTTPS) ---
if (NODE_ENV === 'production') app.set('trust proxy', 1);

// --- Sessions sécurisées ---
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000, // 1 jour
  },
}));

app.use(flash());

// --- CSRF Protection ---
const csrfProtection = csrf();
app.use(csrfProtection);

// --- XSS Sanitizer ---
function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = Array.isArray(obj) ? [] : {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (typeof val === 'string') out[key] = xss(val);
    else if (typeof val === 'object' && val !== null) out[key] = sanitizeObject(val);
    else out[key] = val;
  }
  return out;
}
app.use((req, res, next) => {
  if (req.body) req.body = sanitizeObject(req.body);
  next();
});

// --- Globals pour les vues ---
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.success = req.flash('success')[0];
  res.locals.error = req.flash('error')[0];
  res.locals.currentPath = req.path;
  res.locals.csrfToken = req.csrfToken();
  res.locals.title = 'Mini CRM';
  next();
});

// --- Helper auth ---
function ensureAuthenticated(req, res, next) {
  if (req.session.user) return next();
  req.flash('error', 'Veuillez vous connecter.');
  return res.redirect('/login');
}

// --- Helper datetime (POST/PUT) ---
function buildDatetimeFromDateTime(date, time) {
  if (!date || !time) return null;

  // Expected time format: "HH:MM"
  const parts = String(time).split(':');
  if (parts.length < 2) return null;

  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;

  const datetime = new Date(date);
  if (Number.isNaN(datetime.getTime())) return null;

  datetime.setHours(hours, minutes, 0, 0);
  return datetime;
}

//  Charge Clients + User pour réutilisation en GET edit
async function ensureAppointmentOwner(req, res, next) {
  try {
    const userId = req.session?.user?.id;
    if (!userId) {
      req.flash('error', 'Veuillez vous connecter.');
      return res.redirect('/login');
    }

    const appointment = await Appointment.findByPk(req.params.id, {
      include: [{ model: Client }, { model: User }]
    });

    if (!appointment) {
      req.flash('error', 'Rendez-vous introuvable.');
      return res.redirect('/appointments');
    }

    if (appointment.userId !== userId) {
      req.flash('error', 'Accès refusé : vous n’êtes pas le responsable de ce rendez-vous.');
      return res.redirect('/appointments');
    }

    req.appointment = appointment;
    return next();
  } catch (err) {
    return next(err);
  }
}

// --- Routes principales ---
app.get('/', (req, res) => res.render('index', { title: 'Accueil' }));

// --- Auth ---
app.get('/register', authLimiter, (req, res) => res.render('register', { title: 'Inscription' }));
app.post('/register', authLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      req.flash('error', 'Tous les champs sont requis.');
      return res.redirect('/register');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      req.flash('error', 'Email invalide.');
      return res.redirect('/register');
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(password)) {
      req.flash('error', 'Mot de passe doit contenir au moins 8 caractères, maj, min, chiffre et symbole.');
      return res.redirect('/register');
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      req.flash('error', 'Email déjà utilisé.');
      return res.redirect('/register');
    }

    const hash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, password: hash });

    req.session.user = { id: user.id, name: user.name, email: user.email };
    req.flash('success', 'Inscription réussie.');
    return res.redirect('/clients');
  } catch (err) {
    console.error('Register error:', err);
    req.flash('error', 'Erreur lors de l’inscription.');
    return res.redirect('/register');
  }
});

app.get('/login', authLimiter, (req, res) => res.render('login', { title: 'Connexion' }));
app.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      req.flash('error', 'Email et mot de passe requis.');
      return res.redirect('/login');
    }
    const user = await User.findOne({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      req.flash('error', 'Email ou mot de passe invalide.');
      return res.redirect('/login');
    }

    req.session.user = { id: user.id, name: user.name, email: user.email };
    req.flash('success', 'Connecté avec succès.');
    return res.redirect('/clients');
  } catch (err) {
    console.error('Login error:', err);
    req.flash('error', 'Erreur lors de la connexion.');
    return res.redirect('/login');
  }
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

// --- Clients CRUD ---
app.get('/clients', ensureAuthenticated, async (req, res) => {
  const q = req.query.q || '';
  const where = q ? {
    [Op.or]: [
      { name: { [Op.like]: `%${q}%` } },
      { email: { [Op.like]: `%${q}%` } },
      { phone: { [Op.like]: `%${q}%` } },
    ]
  } : {};
  const clients = await Client.findAll({ where, order: [['name', 'ASC']] });
  res.render('clients', { clients, q, title: 'Clients' });
});

app.get('/clients/new', ensureAuthenticated, (req, res) =>
  res.render('client_form', { client: null, title: 'Nouveau Client' })
);

app.post('/clients', ensureAuthenticated, async (req, res) => {
  const { name, email, phone, notes } = req.body;
  await Client.create({ name, email, phone, notes });
  req.flash('success', 'Client ajouté.');
  res.redirect('/clients');
});

app.get('/clients/:id/edit', ensureAuthenticated, async (req, res) => {
  const client = await Client.findByPk(req.params.id);
  if (!client) {
    req.flash('error', 'Client non trouvé.');
    return res.redirect('/clients');
  }
  res.render('client_form', { client, title: 'Modifier Client' });
});

app.put('/clients/:id', ensureAuthenticated, async (req, res) => {
  const { name, email, phone, notes } = req.body;
  await Client.update({ name, email, phone, notes }, { where: { id: req.params.id } });
  req.flash('success', 'Client mis à jour.');
  res.redirect('/clients');
});

app.delete('/clients/:id', ensureAuthenticated, async (req, res) => {
  await Client.destroy({ where: { id: req.params.id } });
  req.flash('success', 'Client supprimé.');
  res.redirect('/clients');
});

// --- Appointments CRUD ---
app.get('/appointments', ensureAuthenticated, async (req, res) => {
  const appointments = await Appointment.findAll({
    include: [{ model: Client }, { model: User }],
    order: [['datetime', 'ASC']]
  });
  res.render('appointments', { appointments, title: 'Rendez-vous' });
});

app.get('/appointments/new', ensureAuthenticated, async (req, res) => {
  const clients = await Client.findAll({ order: [['name', 'ASC']] });
  res.render('appointment_form', { appointment: null, clients, title: 'Nouveau RDV' });
});

app.post('/appointments', ensureAuthenticated, async (req, res) => {
  const userId = req.session?.user?.id ?? null;
  if (!userId) {
    req.flash('error', 'Vous devez être connecté pour créer un rendez-vous.');
    return res.redirect('/login');
  }

  const { date, time, notes } = req.body;

  const datetime = buildDatetimeFromDateTime(date, time);
  if (!datetime) {
    req.flash('error', 'Date/heure invalide.');
    return res.redirect('/appointments/new');
  }

  const rawClientIds = req.body.clientIds ?? req.body.clientId ?? [];
  const clientIds = Array.isArray(rawClientIds) ? rawClientIds : [rawClientIds];
  const cleanedClientIds = clientIds.filter(Boolean);

  if (cleanedClientIds.length === 0) {
    req.flash('error', 'Veuillez sélectionner au moins un client.');
    return res.redirect('/appointments/new');
  }

  const appointment = await Appointment.create({ userId, datetime, notes });
  await appointment.setClients(cleanedClientIds);

  req.flash('success', 'Rendez-vous ajouté.');
  res.redirect('/appointments');
});

app.get('/appointments/:id/edit', ensureAuthenticated, ensureAppointmentOwner, async (req, res) => {
  const appointment = req.appointment; // déjà chargé (Clients + User)
  const clients = await Client.findAll({ order: [['name', 'ASC']] });
  res.render('appointment_form', { appointment, clients, title: 'Modifier RDV' });
});

app.put('/appointments/:id', ensureAuthenticated, ensureAppointmentOwner, async (req, res) => {
  const { date, time, notes } = req.body;

  const datetime = buildDatetimeFromDateTime(date, time);
  if (!datetime) {
    req.flash('error', 'Date/heure invalide.');
    return res.redirect(`/appointments/${req.params.id}/edit`);
  }

  const rawClientIds = req.body.clientIds ?? req.body.clientId ?? [];
  const clientIds = Array.isArray(rawClientIds) ? rawClientIds : [rawClientIds];
  const cleanedClientIds = clientIds.filter(Boolean);

  if (cleanedClientIds.length === 0) {
    req.flash('error', 'Veuillez sélectionner au moins un client.');
    return res.redirect(`/appointments/${req.params.id}/edit`);
  }

  const appointment = req.appointment; // déjà chargé par le middleware
  await appointment.update({ datetime, notes });
  await appointment.setClients(cleanedClientIds);

  req.flash('success', 'Rendez-vous mis à jour.');
  res.redirect('/appointments');
});

app.delete('/appointments/:id', ensureAuthenticated, ensureAppointmentOwner, async (req, res) => {
  const appointment = req.appointment;
  await appointment.setClients([]);
  await appointment.destroy();

  req.flash('success', 'Rendez-vous supprimé.');
  res.redirect('/appointments');
});

// --- CSRF error ---
app.use((err, req, res, next) => {
  if (err && err.code === 'EBADCSRFTOKEN') {
    req.flash('error', 'Formulaire expiré ou invalide (CSRF).');

    const referrer = req.get('Referrer');
    const sameOrigin = referrer &&
      referrer.startsWith(`${req.protocol}://${req.get('host')}`);

    return res.redirect(sameOrigin ? referrer : '/');
  }
  next(err);
});

// --- Global error handler ---
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('error_500', { title: 'Erreur 500' });
});

// --- Start server ---
(async () => {
  try {
    await sequelize.sync();
    console.log('DB synchronisée');
    app.listen(PORT, () =>
      console.log(`Serveur lancé sur http://localhost:${PORT} (env=${NODE_ENV})`)
    );
  } catch (err) {
    console.error('Erreur au démarrage:', err);
  }
})();
