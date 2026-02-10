// middlewares/authMiddleware.js
export function ensureAuthenticated(req, res, next) {
  if (req.session?.user) return next();

  req.flash('error', 'Veuillez vous connecter.');
  return res.redirect('/login');
}
