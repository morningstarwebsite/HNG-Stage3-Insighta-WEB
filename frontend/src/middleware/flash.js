export function flashMiddleware(req, res, next) {
  req.flash = (type, message) => {
    req.session.flash = { type, message };
  };

  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  next();
}
