import { canManageProfiles } from "./auth.js";

export function viewLocalsMiddleware(req, res, next) {
  res.locals.path = req.path;
  res.locals.currentUser = req.user || req.session?.currentUser || null;
  res.locals.isAdmin = res.locals.currentUser?.role === "admin";
  res.locals.canManageProfiles = canManageProfiles(res.locals.currentUser);

  if (typeof req.csrfToken === "function") {
    try {
      res.locals.csrfToken = req.csrfToken();
    } catch (_) {
      res.locals.csrfToken = "";
    }
  }

  next();
}
